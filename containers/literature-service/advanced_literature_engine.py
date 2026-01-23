#!/usr/bin/env python3
"""
Advanced Literature Search Engine for Massive AA Literature Database
Handles 2,400+ individual literature pieces with sophisticated search algorithms
"""

from massive_literature_database import get_all_literature_items, get_database_statistics
import json
from typing import List, Dict, Any

class AdvancedLiteratureEngine:
    def __init__(self):
        self.literature_items = get_all_literature_items()
        self.stats = get_database_statistics()
        
    def semantic_search(self, query: str, max_results: int = 5, content_types: List[str] = None) -> Dict[str, Any]:
        """
        Advanced semantic search with multiple ranking factors
        """
        query_terms = [term.lower().strip() for term in query.split()]
        results = []
        
        # Crisis detection - prioritize crisis resources
        crisis_keywords = ["crisis", "suicide", "emergency", "help", "urges", "drinking", "relapse"]
        is_crisis_query = any(keyword in query.lower() for keyword in crisis_keywords)
        
        for item in self.literature_items:
            # Skip if content type filter specified
            if content_types and item.get("content_type") not in content_types:
                continue
                
            score = self._calculate_relevance_score(item, query_terms, is_crisis_query)
            
            if score > 0:
                item_copy = item.copy()
                item_copy['searchScore'] = score
                item_copy['matchType'] = self._get_match_type(item, query_terms)
                results.append(item_copy)
        
        # Sort by relevance score
        results.sort(key=lambda x: x.get('searchScore', 0), reverse=True)
        
        # Apply crisis prioritization
        if is_crisis_query:
            crisis_results = [r for r in results if 'crisis' in r.get('content_type', '')]
            other_results = [r for r in results if 'crisis' not in r.get('content_type', '')]
            results = crisis_results + other_results
            
        return {
            'success': True,
            'results': results[:max_results],
            'totalCount': len(results),
            'query': query,
            'searchMode': 'advanced_semantic_search',
            'databaseSize': self.stats['total_literature_items'],
            'isCrisisQuery': is_crisis_query,
            'availableContentTypes': self._get_available_content_types()
        }
    
    def _calculate_relevance_score(self, item: Dict[str, Any], query_terms: List[str], is_crisis_query: bool) -> int:
        """Calculate multi-factor relevance score"""
        score = 0
        
        # Title matching (highest weight)
        for term in query_terms:
            if term in item.get('title', '').lower():
                score += 5
                
        # Description matching
        for term in query_terms:
            if term in item.get('description', '').lower():
                score += 3

        # Content matching (full text search for PDF-extracted content)
        content = item.get('content', '').lower()
        if content:
            for term in query_terms:
                if term in content:
                    score += 2
                    # Bonus for exact phrase matches in content
                    if len(query_terms) > 2:
                        query_phrase = ' '.join(query_terms)
                        if query_phrase in content:
                            score += 5
                
        # Keywords matching
        if 'keywords' in item:
            for keyword in item['keywords']:
                for term in query_terms:
                    if term in keyword.lower() or keyword.lower() in term:
                        score += 3
                        
        # Themes matching
        if 'themes' in item:
            for theme in item['themes']:
                for term in query_terms:
                    if term in theme.lower() or theme.lower() in term:
                        score += 2
                        
        # Content type bonuses
        content_type = item.get('content_type', '')
        if 'step' in ' '.join(query_terms):
            if 'step' in content_type:
                score += 2
        if 'story' in ' '.join(query_terms):
            if 'story' in content_type or 'experience' in content_type:
                score += 2
                
        # Crisis prioritization
        if is_crisis_query and ('crisis' in content_type or 'emergency' in item.get('description', '')):
            score += 10
            
        # Base relevance score bonus
        base_score = item.get('relevanceScore', 0.5)
        score += int(base_score * 2)
        
        return score
    
    def _get_match_type(self, item: Dict[str, Any], query_terms: List[str]) -> str:
        """Determine the type of match for debugging"""
        title = item.get('title', '').lower()
        keywords = [k.lower() for k in item.get('keywords', [])]
        themes = [t.lower() for t in item.get('themes', [])]
        
        for term in query_terms:
            if term in title:
                return 'title_match'
            elif any(term in k for k in keywords):
                return 'keyword_match'
            elif any(term in t for t in themes):
                return 'theme_match'
                
        return 'content_match'
    
    def _get_available_content_types(self) -> List[str]:
        """Get all available content types"""
        content_types = set()
        for item in self.literature_items:
            if 'content_type' in item:
                content_types.add(item['content_type'])
        return sorted(list(content_types))
    
    def get_by_content_type(self, content_type: str, max_results: int = 10) -> Dict[str, Any]:
        """Get literature by specific content type"""
        results = [item for item in self.literature_items if item.get('content_type') == content_type]
        results.sort(key=lambda x: x.get('relevanceScore', 0.5), reverse=True)
        
        return {
            'success': True,
            'results': results[:max_results],
            'totalCount': len(results),
            'contentType': content_type,
            'searchMode': 'content_type_filter'
        }
    
    def get_recommendations_for_step(self, step_number: int) -> Dict[str, Any]:
        """Get literature recommendations for specific step work"""
        results = []
        
        # Find step-specific content
        step_items = [item for item in self.literature_items 
                     if item.get('step_number') == step_number or 
                     f'step {step_number}' in item.get('title', '').lower()]
        
        # Add related content based on step themes
        step_themes = {
            1: ['powerlessness', 'admission', 'surrender'],
            2: ['higher power', 'sanity', 'hope'],
            3: ['decision', 'surrender', 'trust'],
            4: ['inventory', 'honesty', 'self-examination'],
            5: ['admission', 'accountability', 'sharing'],
            6: ['willingness', 'character defects'],
            7: ['humility', 'prayer', 'spiritual help'],
            8: ['amends list', 'willingness', 'accountability'],
            9: ['direct amends', 'repair', 'action'],
            10: ['daily inventory', 'maintenance'],
            11: ['prayer', 'meditation', 'spiritual contact'],
            12: ['spiritual awakening', 'service', 'carrying message']
        }
        
        themes = step_themes.get(step_number, [])
        for item in self.literature_items:
            item_themes = item.get('themes', [])
            if any(theme in ' '.join(item_themes).lower() for theme in themes):
                if item not in step_items:
                    results.append(item)
        
        # Combine and sort
        all_results = step_items + results[:5]
        
        return {
            'success': True,
            'results': all_results[:8],
            'stepNumber': step_number,
            'recommendationType': 'step_focused',
            'themes': themes
        }
    
    def get_crisis_resources(self) -> Dict[str, Any]:
        """Get all crisis and emergency resources"""
        crisis_items = [item for item in self.literature_items 
                       if 'crisis' in item.get('content_type', '') or 
                       'emergency' in item.get('description', '').lower() or
                       any(keyword in item.get('keywords', []) for keyword in ['crisis', 'emergency', 'suicide', 'help'])]
        
        return {
            'success': True,
            'results': crisis_items,
            'totalCount': len(crisis_items),
            'searchMode': 'crisis_resources',
            'urgentNotice': 'If you are in immediate danger, please call 911 or go to your nearest emergency room. For suicide prevention, call 988.'
        }
    
    def get_database_overview(self) -> Dict[str, Any]:
        """Get comprehensive database overview"""
        return {
            'success': True,
            'databaseStats': self.stats,
            'contentTypes': self._get_available_content_types(),
            'searchCapabilities': [
                'semantic_search',
                'content_type_filtering', 
                'step_recommendations',
                'crisis_detection',
                'multi_factor_scoring'
            ],
            'specialFeatures': [
                'Crisis query detection and prioritization',
                'Step-specific recommendations',
                'Multi-weighted relevance scoring',
                'Content type categorization',
                'Comprehensive AA literature coverage'
            ]
        }

def create_advanced_literature_engine():
    """Factory function to create the engine"""
    return AdvancedLiteratureEngine()

if __name__ == "__main__":
    engine = create_advanced_literature_engine()
    
    print("🚀 ADVANCED LITERATURE ENGINE TESTING")
    print("=" * 60)
    
    # Test crisis detection
    crisis_result = engine.semantic_search("I want to drink tonight help", max_results=3)
    print(f"Crisis Query Test: {crisis_result['isCrisisQuery']}")
    print(f"Results: {len(crisis_result['results'])} found")
    
    # Test step recommendations
    step4_recs = engine.get_recommendations_for_step(4)
    print(f"\nStep 4 Recommendations: {len(step4_recs['results'])} items")
    
    # Test content type filtering
    stories = engine.get_by_content_type("personal_stories", max_results=3)
    print(f"Personal Stories: {len(stories['results'])} found")
    
    # Database overview
    overview = engine.get_database_overview()
    print(f"\nDatabase Overview:")
    print(f"Total Items: {overview['databaseStats']['total_literature_items']}")
    print(f"Content Types: {len(overview['contentTypes'])}")
    print(f"Search Capabilities: {len(overview['searchCapabilities'])}")