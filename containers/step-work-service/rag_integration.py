#!/usr/bin/env python3
"""
RAG Integration for Step Work Service
Connects step work with literature search and AI guidance
"""

import json
import urllib.request
import urllib.parse
from typing import Dict, List, Any, Optional

class StepWorkRAGIntegration:
    """Integrates step work with RAG pipeline for contextual guidance"""
    
    def __init__(self, literature_service_url: str, chat_service_url: str):
        self.literature_service_url = literature_service_url.rstrip('/')
        self.chat_service_url = chat_service_url.rstrip('/')
    
    def get_step_guidance(self, step_number: int, specific_challenge: str = "") -> Dict[str, Any]:
        """Get AI-powered guidance for specific step work"""
        
        # Build query for literature search
        base_query = f"Step {step_number} guidance and instructions"
        if specific_challenge:
            query = f"{base_query} {specific_challenge}"
        else:
            query = base_query
        
        try:
            # Step 1: Search literature for step-specific content
            literature_results = self._search_literature(query, max_results=3)
            
            if not literature_results.get('success'):
                return {
                    'success': False,
                    'error': 'Failed to search literature',
                    'fallback_guidance': self._get_fallback_guidance(step_number)
                }
            
            # Step 2: Build context from literature
            context_pieces = []
            for item in literature_results.get('results', []):
                title = item.get('title', '')
                description = item.get('description', '')
                context_pieces.append(f"{title}: {description}")
            
            context = " | ".join(context_pieces)
            
            # Step 3: Get AI guidance with literature context
            guidance_query = f"I need help with Step {step_number} in AA"
            if specific_challenge:
                guidance_query += f". Specifically: {specific_challenge}"
            
            ai_response = self._get_ai_guidance(guidance_query, context)
            
            return {
                'success': True,
                'step_number': step_number,
                'specific_challenge': specific_challenge,
                'literature_results': literature_results.get('results', []),
                'literature_count': len(literature_results.get('results', [])),
                'ai_guidance': ai_response.get('response', ''),
                'tokens_used': ai_response.get('metadata', {}).get('tokensUsed', 0),
                'crisis_detected': literature_results.get('isCrisisQuery', False),
                'context_sources': context_pieces
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'fallback_guidance': self._get_fallback_guidance(step_number)
            }
    
    def get_resentment_guidance(self, resentment_description: str) -> Dict[str, Any]:
        """Get specific guidance for working through a resentment"""
        
        query = f"Step 4 resentment inventory help: {resentment_description}"
        
        try:
            # Search for resentment-specific literature
            literature_results = self._search_literature(query, max_results=2)
            
            # Build context
            context_pieces = []
            for item in literature_results.get('results', []):
                context_pieces.append(f"{item.get('title', '')}: {item.get('description', '')}")
            
            context = " | ".join(context_pieces)
            
            # Get AI guidance for this specific resentment
            guidance_query = f"Help me work through this resentment in Step 4: {resentment_description}. What is my part and how do I let it go?"
            
            ai_response = self._get_ai_guidance(guidance_query, context)
            
            return {
                'success': True,
                'resentment_description': resentment_description,
                'guidance': ai_response.get('response', ''),
                'literature_sources': literature_results.get('results', []),
                'crisis_detected': literature_results.get('isCrisisQuery', False)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'fallback_guidance': "Remember: resentment hurts us more than the other person. Focus on your part and what you can change."
            }
    
    def get_fear_guidance(self, fear_description: str) -> Dict[str, Any]:
        """Get specific guidance for working through a fear"""
        
        query = f"Step 4 fear inventory spiritual guidance: {fear_description}"
        
        try:
            literature_results = self._search_literature(query, max_results=2)
            
            context_pieces = []
            for item in literature_results.get('results', []):
                context_pieces.append(f"{item.get('title', '')}: {item.get('description', '')}")
            
            context = " | ".join(context_pieces)
            
            guidance_query = f"Help me understand and overcome this fear in Step 4: {fear_description}. How do I replace fear with faith?"
            
            ai_response = self._get_ai_guidance(guidance_query, context)
            
            return {
                'success': True,
                'fear_description': fear_description,
                'guidance': ai_response.get('response', ''),
                'literature_sources': literature_results.get('results', []),
                'spiritual_tools': [
                    "Prayer and meditation",
                    "Talk to your sponsor",
                    "Remember that fear is False Evidence Appearing Real",
                    "Focus on today, not future projections"
                ]
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'fallback_guidance': "Fear is often about things we cannot control. Focus on what you can control today."
            }
    
    def get_step_completion_guidance(self, step_number: int, progress_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Get guidance for completing a step based on current progress"""
        
        completion_pct = progress_summary.get('completion_percentage', 0)
        next_section = progress_summary.get('next_recommended_section', '')
        
        query = f"Step {step_number} completion guidance progress {completion_pct}% next {next_section}"
        
        try:
            literature_results = self._search_literature(query, max_results=2)
            
            context_pieces = []
            for item in literature_results.get('results', []):
                context_pieces.append(f"{item.get('title', '')}: {item.get('description', '')}")
            
            context = " | ".join(context_pieces)
            
            if completion_pct < 50:
                guidance_query = f"I'm working on Step {step_number} and I'm {completion_pct}% complete. What should I focus on next?"
            elif completion_pct < 100:
                guidance_query = f"I'm {completion_pct}% through Step {step_number}. How do I finish strong and prepare for the next step?"
            else:
                guidance_query = f"I've completed Step {step_number}. How do I know I'm ready to move to Step {step_number + 1}?"
            
            ai_response = self._get_ai_guidance(guidance_query, context)
            
            return {
                'success': True,
                'step_number': step_number,
                'completion_percentage': completion_pct,
                'guidance': ai_response.get('response', ''),
                'next_actions': self._get_next_actions(step_number, completion_pct, next_section),
                'literature_sources': literature_results.get('results', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'fallback_guidance': f"Keep working on Step {step_number} one day at a time. Progress, not perfection."
            }
    
    def _search_literature(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """Search the literature database"""
        search_data = {"query": query, "maxResults": max_results}
        
        req = urllib.request.Request(
            f"{self.literature_service_url}/api/search",
            data=json.dumps(search_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        return result
    
    def _get_ai_guidance(self, message: str, context: str = "") -> Dict[str, Any]:
        """Get AI-powered guidance from chat service"""
        history = []
        if context:
            history.append({
                "role": "system",
                "content": f"Use this AA recovery literature to enhance your response: {context}"
            })
        
        chat_data = {"message": message, "history": history}
        
        req = urllib.request.Request(
            f"{self.chat_service_url}/api/chat",
            data=json.dumps(chat_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        return result
    
    def _get_fallback_guidance(self, step_number: int) -> str:
        """Fallback guidance when RAG pipeline isn't available"""
        fallback_guidance = {
            1: "Step 1: Admit powerlessness over alcohol and that your life has become unmanageable. This is about honesty, not defeat.",
            2: "Step 2: Come to believe that a Power greater than yourself can restore you to sanity. Stay open-minded about spirituality.",
            3: "Step 3: Make a decision to turn your will and life over to God as you understand Him. This is about surrender and trust.",
            4: "Step 4: Make a searching and fearless moral inventory. Be thorough and honest, but don't beat yourself up.",
            5: "Step 5: Admit to God, yourself, and another person the exact nature of your wrongs. Share with your sponsor or trusted advisor.",
            6: "Step 6: Be entirely ready to have God remove all character defects. Willingness is the key.",
            7: "Step 7: Humbly ask God to remove your shortcomings. Practice humility and continue working the steps.",
            8: "Step 8: Make a list of all persons harmed and become willing to make amends. Focus on willingness.",
            9: "Step 9: Make direct amends except when to do so would injure them or others. Use wisdom and timing.",
            10: "Step 10: Continue to take personal inventory and promptly admit wrongs. This is daily maintenance.",
            11: "Step 11: Improve conscious contact with God through prayer and meditation. Develop a spiritual practice.",
            12: "Step 12: Carry the message to other alcoholics and practice these principles in all affairs. Service is key."
        }
        
        return fallback_guidance.get(step_number, "Continue working the steps one day at a time with your sponsor's guidance.")
    
    def _get_next_actions(self, step_number: int, completion_pct: float, next_section: str) -> List[str]:
        """Get recommended next actions based on progress"""
        actions = []
        
        if step_number == 4:
            if completion_pct < 25:
                actions = [
                    "Continue working on your resentment inventory",
                    "Remember to include institutions and principles you resent",
                    "Don't rush - take time to be thorough"
                ]
            elif completion_pct < 50:
                actions = [
                    "Move on to your fear inventory", 
                    "Look for patterns in your resentments",
                    "Discuss your inventory with your sponsor"
                ]
            elif completion_pct < 75:
                actions = [
                    "Complete your sex conduct review",
                    "Be rigorously honest about your part in relationships",
                    "Remember this is about healing, not shame"
                ]
            else:
                actions = [
                    "Review your complete inventory with your sponsor",
                    "Look for character defects that show up repeatedly",
                    "Prepare for Step 5 - sharing your inventory"
                ]
        else:
            actions = [
                f"Continue working on Step {step_number}",
                "Talk to your sponsor about your progress",
                "Take it one day at a time"
            ]
        
        return actions

def test_rag_integration():
    """Test RAG integration with local services"""
    
    # Use the deployed services
    literature_url = "http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002"
    chat_url = "http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003"
    
    rag = StepWorkRAGIntegration(literature_url, chat_url)
    
    print("🔗 TESTING STEP WORK RAG INTEGRATION")
    print("=" * 60)
    
    # Test 1: General step guidance
    print("\n1. Testing general Step 4 guidance...")
    step4_guidance = rag.get_step_guidance(4, "I'm struggling with finding my part in resentments")
    
    if step4_guidance.get('success'):
        print(f"   ✅ AI guidance received: {len(step4_guidance['ai_guidance'])} characters")
        print(f"   📚 Literature sources: {step4_guidance['literature_count']}")
        print(f"   🤖 Tokens used: {step4_guidance['tokens_used']}")
        print(f"   Preview: {step4_guidance['ai_guidance'][:100]}...")
    else:
        print(f"   ❌ Error: {step4_guidance.get('error')}")
        print(f"   🆘 Fallback: {step4_guidance.get('fallback_guidance', '')[:50]}...")
    
    # Test 2: Resentment-specific guidance
    print("\n2. Testing resentment guidance...")
    resentment_guidance = rag.get_resentment_guidance("My boss who fired me unfairly")
    
    if resentment_guidance.get('success'):
        print(f"   ✅ Resentment guidance received")
        print(f"   📖 Sources: {len(resentment_guidance['literature_sources'])}")
        print(f"   Preview: {resentment_guidance['guidance'][:100]}...")
    else:
        print(f"   ❌ Error: {resentment_guidance.get('error')}")
    
    print(f"\n{'🎯' * 20}")
    print("RAG INTEGRATION TEST COMPLETE")
    print('🎯' * 20)

if __name__ == "__main__":
    test_rag_integration()