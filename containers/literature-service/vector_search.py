#!/usr/bin/env python3
"""
Vector Search Engine for Digital Sponsor Literature Service
Provides semantic search using Azure OpenAI embeddings with hybrid search capabilities.
"""

import json
import os
import urllib.request
import math
import threading
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT = os.environ.get('AZURE_OPENAI_ENDPOINT', 'https://eastus2.api.cognitive.microsoft.com/')
AZURE_OPENAI_API_KEY = os.environ.get('AZURE_OPENAI_API_KEY', '')
AZURE_OPENAI_EMBEDDING_DEPLOYMENT = os.environ.get('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-ada-002')

# Embedding dimension for text-embedding-ada-002
EMBEDDING_DIM = 1536


@dataclass
class SearchResult:
    """A single search result with scores"""
    item: Dict[str, Any]
    keyword_score: float = 0.0
    semantic_score: float = 0.0
    combined_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        result = self.item.copy()
        result['keywordScore'] = round(self.keyword_score, 4)
        result['semanticScore'] = round(self.semantic_score, 4)
        result['combinedScore'] = round(self.combined_score, 4)
        return result


class VectorSearchEngine:
    """
    Semantic search engine using Azure OpenAI embeddings.
    Supports keyword search, semantic search, and hybrid search.
    """

    def __init__(self):
        self.embeddings: Dict[str, List[float]] = {}  # item_id -> embedding
        self.literature_items: Dict[str, Dict[str, Any]] = {}  # item_id -> item
        self.is_initialized: bool = False
        self._lock = threading.Lock()
        self.last_precompute_time: Optional[datetime] = None
        self.embedding_errors: List[str] = []

    def _call_azure_openai_embedding(self, text: str) -> Optional[List[float]]:
        """Call Azure OpenAI for text embeddings"""
        if not AZURE_OPENAI_API_KEY:
            return None

        try:
            url = f"{AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=2024-08-01-preview"

            headers = {
                'api-key': AZURE_OPENAI_API_KEY,
                'Content-Type': 'application/json'
            }

            # Truncate text to avoid token limits (roughly 8000 tokens max)
            truncated_text = text[:30000] if len(text) > 30000 else text

            data = {"input": truncated_text}

            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode('utf-8'),
                headers=headers
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))

            if 'data' in result and len(result['data']) > 0:
                return result['data'][0]['embedding']
            return None

        except Exception as e:
            self.embedding_errors.append(f"{datetime.now().isoformat()}: {str(e)}")
            return None

    def precompute_embeddings(self, literature_items: List[Dict[str, Any]],
                              batch_size: int = 10) -> Dict[str, Any]:
        """
        Pre-compute embeddings for all literature items.
        Call this on service startup.

        Returns statistics about the precomputation.
        """
        with self._lock:
            stats = {
                'total_items': len(literature_items),
                'successful': 0,
                'failed': 0,
                'skipped': 0,
                'start_time': datetime.now().isoformat()
            }

            print(f"🔄 Starting embedding precomputation for {len(literature_items)} items...")

            for i, item in enumerate(literature_items):
                item_id = item.get('id', f'item_{i}')
                self.literature_items[item_id] = item

                # Create searchable text from item
                search_text = self._create_search_text(item)

                # Check if we already have this embedding cached
                if item_id in self.embeddings:
                    stats['skipped'] += 1
                    continue

                # Get embedding from Azure OpenAI
                embedding = self._call_azure_openai_embedding(search_text)

                if embedding:
                    self.embeddings[item_id] = embedding
                    stats['successful'] += 1
                else:
                    stats['failed'] += 1

                # Progress logging
                if (i + 1) % batch_size == 0:
                    print(f"  📊 Progress: {i + 1}/{len(literature_items)} items processed")

            self.is_initialized = stats['successful'] > 0
            self.last_precompute_time = datetime.now()
            stats['end_time'] = datetime.now().isoformat()
            stats['embeddings_available'] = len(self.embeddings)

            print(f"✅ Embedding precomputation complete: {stats['successful']} successful, {stats['failed']} failed")

            return stats

    def _create_search_text(self, item: Dict[str, Any]) -> str:
        """Create searchable text from a literature item"""
        parts = [
            item.get('title', ''),
            item.get('content', ''),
        ]

        # Add keywords and themes if available
        if 'keywords' in item:
            parts.append(' '.join(item['keywords']))
        if 'themes' in item:
            parts.append(' '.join(item['themes']))

        return ' '.join(filter(None, parts))

    def _cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if len(vec_a) != len(vec_b):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_product / (norm_a * norm_b)

    def _keyword_score(self, query: str, item: Dict[str, Any]) -> float:
        """Calculate keyword-based relevance score"""
        query_terms = [term.lower().strip() for term in query.split() if term.strip()]
        if not query_terms:
            return 0.0

        score = 0.0
        search_text = self._create_search_text(item).lower()

        # Title matches (highest weight)
        title_lower = item.get('title', '').lower()
        for term in query_terms:
            if term in title_lower:
                score += 3.0

        # Content matches
        content_lower = item.get('content', '').lower()
        for term in query_terms:
            if term in content_lower:
                score += 2.0

        # Keyword matches
        if 'keywords' in item:
            keywords_str = ' '.join(item['keywords']).lower()
            for term in query_terms:
                if term in keywords_str:
                    score += 2.0

        # Theme matches
        if 'themes' in item:
            themes_str = ' '.join(item['themes']).lower()
            for term in query_terms:
                if term in themes_str:
                    score += 1.0

        # Normalize by number of query terms
        return score / len(query_terms)

    def keyword_search(self, query: str, top_k: int = 10) -> List[SearchResult]:
        """
        Perform keyword-only search.
        """
        results = []

        for item_id, item in self.literature_items.items():
            score = self._keyword_score(query, item)
            if score > 0:
                results.append(SearchResult(
                    item=item,
                    keyword_score=score,
                    semantic_score=0.0,
                    combined_score=score
                ))

        # Sort by score descending
        results.sort(key=lambda x: x.keyword_score, reverse=True)
        return results[:top_k]

    def semantic_search(self, query: str, top_k: int = 10) -> List[SearchResult]:
        """
        Perform semantic search using embeddings.
        Falls back to keyword search if embeddings aren't available.
        """
        if not self.is_initialized or not self.embeddings:
            print("⚠️ Semantic search unavailable, falling back to keyword search")
            return self.keyword_search(query, top_k)

        # Get query embedding
        query_embedding = self._call_azure_openai_embedding(query)

        if not query_embedding:
            print("⚠️ Failed to get query embedding, falling back to keyword search")
            return self.keyword_search(query, top_k)

        results = []

        for item_id, item_embedding in self.embeddings.items():
            similarity = self._cosine_similarity(query_embedding, item_embedding)
            item = self.literature_items.get(item_id, {})

            if similarity > 0:
                results.append(SearchResult(
                    item=item,
                    keyword_score=0.0,
                    semantic_score=similarity,
                    combined_score=similarity
                ))

        # Sort by semantic score descending
        results.sort(key=lambda x: x.semantic_score, reverse=True)
        return results[:top_k]

    def hybrid_search(self, query: str, top_k: int = 10,
                      keyword_weight: float = 0.4,
                      semantic_weight: float = 0.6) -> List[SearchResult]:
        """
        Perform hybrid search combining keyword (40%) and semantic (60%) scores.

        Args:
            query: Search query
            top_k: Number of results to return
            keyword_weight: Weight for keyword score (default 0.4)
            semantic_weight: Weight for semantic score (default 0.6)

        Returns:
            List of SearchResult objects sorted by combined score
        """
        # Normalize weights
        total_weight = keyword_weight + semantic_weight
        keyword_weight = keyword_weight / total_weight
        semantic_weight = semantic_weight / total_weight

        # Get query embedding if semantic search is available
        query_embedding = None
        if self.is_initialized and self.embeddings:
            query_embedding = self._call_azure_openai_embedding(query)

        results_dict: Dict[str, SearchResult] = {}

        # Calculate scores for all items
        for item_id, item in self.literature_items.items():
            keyword_score = self._keyword_score(query, item)

            semantic_score = 0.0
            if query_embedding and item_id in self.embeddings:
                semantic_score = self._cosine_similarity(
                    query_embedding,
                    self.embeddings[item_id]
                )

            # Skip items with no relevance
            if keyword_score == 0 and semantic_score == 0:
                continue

            # Calculate combined score
            combined_score = (keyword_weight * keyword_score) + (semantic_weight * semantic_score)

            results_dict[item_id] = SearchResult(
                item=item,
                keyword_score=keyword_score,
                semantic_score=semantic_score,
                combined_score=combined_score
            )

        # Sort by combined score
        results = sorted(results_dict.values(), key=lambda x: x.combined_score, reverse=True)
        return results[:top_k]

    def get_status(self) -> Dict[str, Any]:
        """Get the status of the vector search engine"""
        return {
            'is_initialized': self.is_initialized,
            'total_items': len(self.literature_items),
            'embeddings_computed': len(self.embeddings),
            'last_precompute_time': self.last_precompute_time.isoformat() if self.last_precompute_time else None,
            'recent_errors': self.embedding_errors[-5:] if self.embedding_errors else []
        }

    def add_item(self, item: Dict[str, Any], compute_embedding: bool = True) -> bool:
        """
        Add a single item to the search index.

        Args:
            item: Literature item to add
            compute_embedding: Whether to compute embedding immediately

        Returns:
            True if successful
        """
        item_id = item.get('id')
        if not item_id:
            return False

        with self._lock:
            self.literature_items[item_id] = item

            if compute_embedding:
                search_text = self._create_search_text(item)
                embedding = self._call_azure_openai_embedding(search_text)
                if embedding:
                    self.embeddings[item_id] = embedding
                    return True
                return False

            return True


# Global instance for the service
VECTOR_SEARCH_ENGINE = VectorSearchEngine()


def initialize_search_engine(literature_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Initialize the vector search engine with literature items.
    Call this on service startup.
    """
    return VECTOR_SEARCH_ENGINE.precompute_embeddings(literature_items)


def search(query: str, mode: str = 'hybrid', top_k: int = 10) -> List[Dict[str, Any]]:
    """
    Perform a search with the specified mode.

    Args:
        query: Search query
        mode: 'keyword', 'semantic', or 'hybrid' (default)
        top_k: Number of results

    Returns:
        List of search results as dictionaries
    """
    if mode == 'keyword':
        results = VECTOR_SEARCH_ENGINE.keyword_search(query, top_k)
    elif mode == 'semantic':
        results = VECTOR_SEARCH_ENGINE.semantic_search(query, top_k)
    else:  # hybrid (default)
        results = VECTOR_SEARCH_ENGINE.hybrid_search(query, top_k)

    return [r.to_dict() for r in results]


def get_search_status() -> Dict[str, Any]:
    """Get the current status of the search engine"""
    return VECTOR_SEARCH_ENGINE.get_status()


# ============================================================================
# TEST
# ============================================================================
if __name__ == "__main__":
    print("Vector Search Engine Test")
    print("=" * 50)

    # Create test items
    test_items = [
        {
            "id": "test1",
            "title": "Step 1: Powerlessness",
            "content": "We admitted we were powerless over alcohol",
            "keywords": ["powerless", "admission"],
            "themes": ["surrender"]
        },
        {
            "id": "test2",
            "title": "Step 2: Came to Believe",
            "content": "Came to believe that a Power greater than ourselves could restore us to sanity",
            "keywords": ["believe", "higher power", "sanity"],
            "themes": ["faith", "hope"]
        }
    ]

    # Test keyword search (works without API key)
    engine = VectorSearchEngine()
    for item in test_items:
        engine.literature_items[item['id']] = item

    print("\nKeyword Search Test:")
    results = engine.keyword_search("powerless admission", top_k=5)
    for r in results:
        print(f"  - {r.item['title']}: score={r.keyword_score}")

    print("\nStatus:", engine.get_status())
