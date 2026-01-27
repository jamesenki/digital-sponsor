#!/usr/bin/env python3
"""
Digital Sponsor Cosmos DB Client
Shared database client for all Python services
"""

import os
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, TypeVar, Generic
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Type variable for generic repository
T = TypeVar('T')


class CosmosDBError(Exception):
    """Custom exception for Cosmos DB operations"""
    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(message)
        self.original_error = original_error


class CosmosDBClient:
    """
    Base Cosmos DB client with CRUD operations.
    Falls back to in-memory storage if connection string not available.
    """

    def __init__(self, connection_string: Optional[str] = None, database_name: str = "DigitalSponsor"):
        self.connection_string = connection_string or os.environ.get('COSMOS_CONNECTION_STRING', '')
        self.database_name = database_name
        self.client = None
        self.database = None
        self._in_memory_mode = False
        self._in_memory_store: Dict[str, Dict[str, Any]] = {}

        self._initialize_client()

    def _initialize_client(self):
        """Initialize Cosmos DB client or fall back to in-memory"""
        if not self.connection_string:
            logger.warning("No COSMOS_CONNECTION_STRING - using in-memory storage (data will be lost on restart)")
            self._in_memory_mode = True
            return

        try:
            from azure.cosmos import CosmosClient, exceptions
            self.client = CosmosClient.from_connection_string(self.connection_string)
            self.database = self.client.get_database_client(self.database_name)
            logger.info(f"Connected to Cosmos DB database: {self.database_name}")
        except ImportError:
            logger.warning("azure-cosmos package not installed - using in-memory storage")
            self._in_memory_mode = True
        except Exception as e:
            logger.error(f"Failed to connect to Cosmos DB: {e} - using in-memory storage")
            self._in_memory_mode = True

    def _get_container(self, container_name: str):
        """Get a container client"""
        if self._in_memory_mode:
            if container_name not in self._in_memory_store:
                self._in_memory_store[container_name] = {}
            return None
        return self.database.get_container_client(container_name)

    def create(self, container_name: str, document: Dict[str, Any]) -> Dict[str, Any]:
        """Create a document"""
        now = datetime.utcnow().isoformat() + 'Z'

        # Ensure required fields
        if 'id' not in document:
            document['id'] = str(uuid.uuid4())
        document['createdAt'] = now
        document['updatedAt'] = now
        document['version'] = 1

        if self._in_memory_mode:
            if container_name not in self._in_memory_store:
                self._in_memory_store[container_name] = {}
            self._in_memory_store[container_name][document['id']] = document
            logger.debug(f"[IN-MEMORY] Created document {document['id']} in {container_name}")
            return document

        try:
            container = self._get_container(container_name)
            result = container.create_item(body=document)
            logger.info(f"Created document {document['id']} in {container_name}")
            return result
        except Exception as e:
            raise CosmosDBError(f"Failed to create document in {container_name}", e)

    def get_by_id(self, container_name: str, document_id: str, partition_key: str) -> Optional[Dict[str, Any]]:
        """Get a document by ID"""
        if self._in_memory_mode:
            store = self._in_memory_store.get(container_name, {})
            return store.get(document_id)

        try:
            container = self._get_container(container_name)
            result = container.read_item(item=document_id, partition_key=partition_key)
            return result
        except Exception as e:
            if 'NotFound' in str(e) or '404' in str(e):
                return None
            raise CosmosDBError(f"Failed to get document {document_id} from {container_name}", e)

    def update(self, container_name: str, document_id: str, partition_key: str,
               updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a document"""
        existing = self.get_by_id(container_name, document_id, partition_key)
        if not existing:
            raise CosmosDBError(f"Document {document_id} not found in {container_name}")

        # Apply updates
        existing.update(updates)
        existing['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
        existing['version'] = existing.get('version', 0) + 1

        if self._in_memory_mode:
            self._in_memory_store[container_name][document_id] = existing
            logger.debug(f"[IN-MEMORY] Updated document {document_id} in {container_name}")
            return existing

        try:
            container = self._get_container(container_name)
            result = container.replace_item(item=document_id, body=existing)
            logger.info(f"Updated document {document_id} in {container_name}")
            return result
        except Exception as e:
            raise CosmosDBError(f"Failed to update document {document_id} in {container_name}", e)

    def delete(self, container_name: str, document_id: str, partition_key: str) -> bool:
        """Delete a document"""
        if self._in_memory_mode:
            store = self._in_memory_store.get(container_name, {})
            if document_id in store:
                del store[document_id]
                logger.debug(f"[IN-MEMORY] Deleted document {document_id} from {container_name}")
                return True
            return False

        try:
            container = self._get_container(container_name)
            container.delete_item(item=document_id, partition_key=partition_key)
            logger.info(f"Deleted document {document_id} from {container_name}")
            return True
        except Exception as e:
            if 'NotFound' in str(e) or '404' in str(e):
                return False
            raise CosmosDBError(f"Failed to delete document {document_id} from {container_name}", e)

    def query(self, container_name: str, query: str, parameters: Optional[List[Dict]] = None,
              partition_key: Optional[str] = None, max_items: int = 100) -> List[Dict[str, Any]]:
        """Query documents"""
        if self._in_memory_mode:
            # Simple in-memory query - return all docs in container for now
            # Real query parsing would be complex, so we return all and let caller filter
            store = self._in_memory_store.get(container_name, {})
            return list(store.values())[:max_items]

        try:
            container = self._get_container(container_name)

            # Build query kwargs
            query_kwargs = {
                'query': query,
                'parameters': parameters or [],
                'max_item_count': max_items,
            }

            if partition_key:
                query_kwargs['partition_key'] = partition_key
            else:
                query_kwargs['enable_cross_partition_query'] = True

            logger.debug(f"Querying {container_name} with partition_key={partition_key}")
            items = list(container.query_items(**query_kwargs))
            logger.debug(f"Query returned {len(items)} items")
            return items
        except Exception as e:
            logger.error(f"Query error in {container_name}: {type(e).__name__}: {str(e)}")
            raise CosmosDBError(f"Failed to query {container_name}", e)

    def health_check(self) -> Dict[str, Any]:
        """Check database health"""
        if self._in_memory_mode:
            return {
                'healthy': True,
                'mode': 'in_memory',
                'message': 'Using in-memory storage (no persistence)',
                'document_count': sum(len(store) for store in self._in_memory_store.values())
            }

        try:
            # Try to read database properties
            self.database.read()
            return {
                'healthy': True,
                'mode': 'cosmos_db',
                'database': self.database_name,
                'message': 'Connected to Cosmos DB'
            }
        except Exception as e:
            return {
                'healthy': False,
                'mode': 'cosmos_db',
                'message': f'Connection error: {str(e)}'
            }


class UserRepository:
    """
    Repository for user-related data.
    Uses UserSessions container for users, invitations, and sessions.
    """

    CONTAINER_NAME = 'UserSessions'

    def __init__(self, cosmos_client: Optional[CosmosDBClient] = None):
        self.db = cosmos_client or CosmosDBClient()

    # ========================
    # USER OPERATIONS
    # ========================

    def create_user(self, email: str, first_name: str, last_name: str = '',
                    password_hash: str = '', roles: List[str] = None,
                    invitation_type: str = 'general', auth_provider: str = 'local',
                    display_name: str = '', phone: str = '', encryption_salt: str = '') -> Dict[str, Any]:
        """Create a new user"""
        user_id = f"user_{uuid.uuid4()}"

        # Generate encryption salt if not provided
        if not encryption_salt:
            encryption_salt = uuid.uuid4().hex

        user = {
            'id': user_id,
            'docType': 'user',
            'userId': user_id,  # Partition key
            'email': email.lower(),
            'displayName': display_name or first_name,
            'firstName': first_name,
            'lastName': last_name,
            'phone': phone,
            'passwordHash': password_hash,
            'encryptionSalt': encryption_salt,
            'roles': roles or ['user'],
            'invitationType': invitation_type,
            'authProvider': auth_provider,
            'profile': {
                'betaAccess': True,
                'isAdmin': 'admin' in (roles or []),
                'sobrietyDate': None,
                'homeGroup': None,
                'sponsorName': None,
                'preferences': {}
            },
            'searchHistory': [],
            'chatHistory': [],
            'isActive': True
        }

        return self.db.create(self.CONTAINER_NAME, user)

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return self.db.get_by_id(self.CONTAINER_NAME, user_id, user_id)

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        email = email.lower()

        if self.db._in_memory_mode:
            # In-memory search
            store = self.db._in_memory_store.get(self.CONTAINER_NAME, {})
            for doc in store.values():
                if doc.get('docType') == 'user' and doc.get('email') == email:
                    return doc
            return None

        results = self.db.query(
            self.CONTAINER_NAME,
            "SELECT * FROM c WHERE c.docType = 'user' AND c.email = @email",
            [{'name': '@email', 'value': email}],
            max_items=1
        )
        return results[0] if results else None

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user fields"""
        return self.db.update(self.CONTAINER_NAME, user_id, user_id, updates)

    def delete_user(self, user_id: str) -> bool:
        """Delete a user and all their data"""
        return self.db.delete(self.CONTAINER_NAME, user_id, user_id)

    def add_search_history(self, user_id: str, query: str, results_count: int) -> None:
        """Add search to user's history (keep last 100)"""
        user = self.get_user_by_id(user_id)
        if not user:
            return

        history = user.get('searchHistory', [])
        history.append({
            'query': query,
            'resultsCount': results_count,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })

        # Keep only last 100
        if len(history) > 100:
            history = history[-100:]

        self.update_user(user_id, {'searchHistory': history})

    def add_chat_history(self, user_id: str, message: str, response: str) -> None:
        """Add chat exchange to user's history (keep last 100)"""
        user = self.get_user_by_id(user_id)
        if not user:
            return

        history = user.get('chatHistory', [])
        history.append({
            'message': message,
            'response': response[:500],  # Truncate long responses
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })

        # Keep only last 100
        if len(history) > 100:
            history = history[-100:]

        self.update_user(user_id, {'chatHistory': history})

    def get_user_history(self, user_id: str) -> Dict[str, Any]:
        """Get combined search and chat history for a user"""
        user = self.get_user_by_id(user_id)
        if not user:
            return {'searchHistory': [], 'chatHistory': []}

        return {
            'searchHistory': user.get('searchHistory', []),
            'chatHistory': user.get('chatHistory', [])
        }

    def clear_user_history(self, user_id: str) -> bool:
        """Clear user's search and chat history (GDPR)"""
        try:
            self.update_user(user_id, {'searchHistory': [], 'chatHistory': []})
            return True
        except Exception:
            return False

    # ========================
    # INVITATION OPERATIONS
    # ========================

    def create_invitation(self, email: str, first_name: str,
                         invitation_type: str = 'general',
                         expires_days: int = 3) -> Dict[str, Any]:
        """Create a beta invitation"""
        import time

        code = f"DS-{invitation_type.upper()}-{uuid.uuid4().hex[:8].upper()}"
        invitation_id = f"inv_{code}"

        invitation = {
            'id': invitation_id,
            'docType': 'invitation',
            'userId': invitation_id,  # Partition key
            'code': code,
            'type': invitation_type,
            'email': email.lower(),
            'firstName': first_name,
            'used': False,
            'usedBy': None,
            'usedAt': None,
            'expiresAt': time.time() + (expires_days * 24 * 60 * 60)
        }

        return self.db.create(self.CONTAINER_NAME, invitation)

    def get_invitation_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Get invitation by code"""
        invitation_id = f"inv_{code}"

        if self.db._in_memory_mode:
            store = self.db._in_memory_store.get(self.CONTAINER_NAME, {})
            for doc in store.values():
                if doc.get('docType') == 'invitation' and doc.get('code') == code:
                    return doc
            return None

        results = self.db.query(
            self.CONTAINER_NAME,
            "SELECT * FROM c WHERE c.docType = 'invitation' AND c.code = @code",
            [{'name': '@code', 'value': code}],
            max_items=1
        )
        return results[0] if results else None

    def mark_invitation_used(self, code: str, user_id: str) -> bool:
        """Mark invitation as used"""
        import time
        invitation = self.get_invitation_by_code(code)
        if not invitation:
            return False

        self.db.update(
            self.CONTAINER_NAME,
            invitation['id'],
            invitation['userId'],
            {
                'used': True,
                'usedBy': user_id,
                'usedAt': time.time()
            }
        )
        return True

    def validate_invitation(self, code: str) -> Dict[str, Any]:
        """Validate an invitation code"""
        import time

        if not code:
            return {'valid': False, 'message': 'Invalid invitation code'}

        invitation = self.get_invitation_by_code(code)
        if not invitation:
            return {'valid': False, 'message': 'Invalid invitation code'}

        if invitation['used']:
            return {'valid': False, 'message': 'Invitation code has already been used'}

        if time.time() > invitation['expiresAt']:
            return {'valid': False, 'message': 'Invitation code has expired'}

        return {
            'valid': True,
            'code': code,
            'type': invitation['type'],
            'firstName': invitation['firstName'],
            'message': 'Valid invitation code - proceed with registration'
        }

    # ========================
    # SESSION OPERATIONS
    # ========================

    def create_session(self, user_id: str, email: str, expires_hours: int = 24) -> Dict[str, Any]:
        """Create a login session"""
        import time

        session_id = f"session_{uuid.uuid4()}"

        session = {
            'id': session_id,
            'docType': 'session',
            'userId': user_id,  # Partition key
            'email': email,
            'isActive': True,
            'expiresAt': time.time() + (expires_hours * 60 * 60)
        }

        return self.db.create(self.CONTAINER_NAME, session)

    def get_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a session"""
        return self.db.get_by_id(self.CONTAINER_NAME, session_id, user_id)

    def invalidate_session(self, session_id: str, user_id: str) -> bool:
        """Invalidate a session"""
        try:
            self.db.update(self.CONTAINER_NAME, session_id, user_id, {'isActive': False})
            return True
        except Exception:
            return False


class StepWorkRepository:
    """
    Repository for step work data.
    Uses StepWork container for sessions, inventories, and version history.
    """

    CONTAINER_NAME = 'StepWork'

    def __init__(self, cosmos_client: Optional[CosmosDBClient] = None):
        self.db = cosmos_client or CosmosDBClient()

    # ========================
    # STEP WORK SESSION OPERATIONS
    # ========================

    def create_step_work_session(self, user_id: str, step_number: int,
                                  previous_version_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new step work session (version)"""
        # Get version number
        version_number = 1
        if previous_version_id:
            previous = self.get_step_work_session(previous_version_id, user_id)
            if previous:
                version_number = previous.get('versionNumber', 0) + 1
        else:
            # Check if this step has been worked before
            existing = self.get_step_work_history(user_id, step_number)
            if existing:
                version_number = len(existing) + 1

        session_id = f"stepwork_{uuid.uuid4()}"

        session = {
            'id': session_id,
            'docType': 'step_work_session',
            'userId': user_id,  # Partition key
            'stepNumber': step_number,
            'versionNumber': version_number,
            'previousVersionId': previous_version_id,
            'status': 'in_progress',
            'startedAt': datetime.utcnow().isoformat() + 'Z',
            'completedAt': None,
            'inventory': None,  # For Step 4
            'responses': [],    # Q&A responses
            'reflectionResponses': [],  # Reflection on changes
            'notes': ''
        }

        return self.db.create(self.CONTAINER_NAME, session)

    def get_step_work_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a step work session"""
        return self.db.get_by_id(self.CONTAINER_NAME, session_id, user_id)

    def update_step_work_session(self, session_id: str, user_id: str,
                                  updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a step work session"""
        return self.db.update(self.CONTAINER_NAME, session_id, user_id, updates)

    def complete_step_work_session(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """Mark a step work session as complete"""
        return self.db.update(self.CONTAINER_NAME, session_id, user_id, {
            'status': 'completed',
            'completedAt': datetime.utcnow().isoformat() + 'Z'
        })

    def get_step_work_history(self, user_id: str, step_number: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all step work sessions for a user, optionally filtered by step"""
        if self.db._in_memory_mode:
            store = self.db._in_memory_store.get(self.CONTAINER_NAME, {})
            results = []
            for doc in store.values():
                if doc.get('docType') == 'step_work_session' and doc.get('userId') == user_id:
                    if step_number is None or doc.get('stepNumber') == step_number:
                        results.append(doc)
            return sorted(results, key=lambda x: x.get('versionNumber', 0))

        if step_number:
            query = """
                SELECT * FROM c
                WHERE c.docType = 'step_work_session'
                AND c.userId = @userId
                AND c.stepNumber = @stepNumber
                ORDER BY c.versionNumber
            """
            params = [
                {'name': '@userId', 'value': user_id},
                {'name': '@stepNumber', 'value': step_number}
            ]
        else:
            query = """
                SELECT * FROM c
                WHERE c.docType = 'step_work_session'
                AND c.userId = @userId
                ORDER BY c.stepNumber, c.versionNumber
            """
            params = [{'name': '@userId', 'value': user_id}]

        return self.db.query(self.CONTAINER_NAME, query, params, partition_key=user_id)

    def get_latest_step_work(self, user_id: str, step_number: int) -> Optional[Dict[str, Any]]:
        """Get the most recent step work session for a specific step"""
        history = self.get_step_work_history(user_id, step_number)
        if not history:
            return None
        return history[-1]  # Most recent version

    def has_worked_step_before(self, user_id: str, step_number: int) -> bool:
        """Check if user has completed this step before"""
        history = self.get_step_work_history(user_id, step_number)
        return any(s.get('status') == 'completed' for s in history)

    # ========================
    # RESPONSE OPERATIONS
    # ========================

    def add_response(self, session_id: str, user_id: str,
                     prompt: str, response: str, section: str = 'general') -> Dict[str, Any]:
        """Add a Q&A response to a step work session"""
        session = self.get_step_work_session(session_id, user_id)
        if not session:
            raise CosmosDBError(f"Step work session {session_id} not found")

        responses = session.get('responses', [])
        responses.append({
            'id': str(uuid.uuid4()),
            'section': section,
            'prompt': prompt,
            'response': response,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })

        return self.update_step_work_session(session_id, user_id, {'responses': responses})

    def add_reflection_response(self, session_id: str, user_id: str,
                                 question: str, response: str,
                                 previous_response: str = '',
                                 change_noted: str = '') -> Dict[str, Any]:
        """Add a reflection response (for repeat step work)"""
        session = self.get_step_work_session(session_id, user_id)
        if not session:
            raise CosmosDBError(f"Step work session {session_id} not found")

        reflections = session.get('reflectionResponses', [])
        reflections.append({
            'id': str(uuid.uuid4()),
            'question': question,
            'response': response,
            'previousResponse': previous_response,
            'changeNoted': change_noted,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        })

        return self.update_step_work_session(session_id, user_id, {'reflectionResponses': reflections})

    # ========================
    # STEP 4 INVENTORY OPERATIONS
    # ========================

    def save_resentment(self, session_id: str, user_id: str, resentment: Dict[str, Any]) -> str:
        """Save a resentment entry to Step 4 inventory"""
        session = self.get_step_work_session(session_id, user_id)
        if not session:
            raise CosmosDBError(f"Step work session {session_id} not found")

        inventory = session.get('inventory') or {
            'resentments': [],
            'fears': [],
            'sexConduct': [],
            'harmsDone': []
        }

        entry_id = str(uuid.uuid4())
        resentment['id'] = entry_id
        resentment['createdAt'] = datetime.utcnow().isoformat() + 'Z'

        inventory['resentments'].append(resentment)
        self.update_step_work_session(session_id, user_id, {'inventory': inventory})

        return entry_id

    def save_fear(self, session_id: str, user_id: str, fear: Dict[str, Any]) -> str:
        """Save a fear entry to Step 4 inventory"""
        session = self.get_step_work_session(session_id, user_id)
        if not session:
            raise CosmosDBError(f"Step work session {session_id} not found")

        inventory = session.get('inventory') or {
            'resentments': [],
            'fears': [],
            'sexConduct': [],
            'harmsDone': []
        }

        entry_id = str(uuid.uuid4())
        fear['id'] = entry_id
        fear['createdAt'] = datetime.utcnow().isoformat() + 'Z'

        inventory['fears'].append(fear)
        self.update_step_work_session(session_id, user_id, {'inventory': inventory})

        return entry_id

    def get_inventory(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get the Step 4 inventory for a session"""
        session = self.get_step_work_session(session_id, user_id)
        if not session:
            return None
        return session.get('inventory')

    # ========================
    # USER PROGRESS OPERATIONS
    # ========================

    def get_user_progress(self, user_id: str) -> Dict[str, Any]:
        """Get overall step work progress for a user"""
        history = self.get_step_work_history(user_id)

        progress = {
            'totalSessions': len(history),
            'stepProgress': {},
            'currentSteps': [],
            'completedSteps': []
        }

        for step in range(1, 13):
            step_history = [s for s in history if s.get('stepNumber') == step]
            completed = [s for s in step_history if s.get('status') == 'completed']
            in_progress = [s for s in step_history if s.get('status') == 'in_progress']

            progress['stepProgress'][step] = {
                'timesWorked': len(completed),
                'currentVersion': len(step_history),
                'hasInProgress': len(in_progress) > 0,
                'lastCompleted': max((s.get('completedAt') for s in completed), default=None)
            }

            if in_progress:
                progress['currentSteps'].append(step)
            if completed:
                progress['completedSteps'].append(step)

        return progress

    def delete_all_user_data(self, user_id: str) -> bool:
        """Delete all step work data for a user (GDPR)"""
        try:
            history = self.get_step_work_history(user_id)
            for session in history:
                self.db.delete(self.CONTAINER_NAME, session['id'], user_id)
            return True
        except Exception as e:
            logger.error(f"Failed to delete user data: {e}")
            return False


class EncryptedDataRepository:
    """
    Repository for encrypted user data (step work, chat history).
    Data is encrypted client-side - server only stores opaque blobs.
    """

    CONTAINER_NAME = 'EncryptedUserData'

    def __init__(self, cosmos_client: Optional[CosmosDBClient] = None):
        self.db = cosmos_client or CosmosDBClient()

    def save_encrypted_data(self, user_id: str, data_type: str, item_id: str,
                            encrypted_payload: Dict[str, Any],
                            metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Save encrypted data for a user.

        Args:
            user_id: The user's ID (partition key)
            data_type: Type of data ('stepwork' or 'chat')
            item_id: Unique identifier for this item
            encrypted_payload: The encrypted data blob (includes 'data' and 'iv')
            metadata: Unencrypted metadata for queries (key, timestamp, etc.)
        """
        doc_id = f"{data_type}_{user_id}_{item_id}"

        document = {
            'id': doc_id,
            'docType': 'encrypted_data',
            'userId': user_id,
            'dataType': data_type,
            'itemId': item_id,
            'encryptedPayload': encrypted_payload,
            'metadata': metadata or {},
            'updatedAt': datetime.utcnow().isoformat() + 'Z'
        }

        # Check if document exists - upsert
        existing = self.db.get_by_id(self.CONTAINER_NAME, doc_id, user_id)
        if existing:
            return self.db.update(self.CONTAINER_NAME, doc_id, user_id, {
                'encryptedPayload': encrypted_payload,
                'metadata': metadata or {},
                'updatedAt': datetime.utcnow().isoformat() + 'Z'
            })
        else:
            return self.db.create(self.CONTAINER_NAME, document)

    def get_encrypted_data(self, user_id: str, data_type: str) -> List[Dict[str, Any]]:
        """Get all encrypted data of a specific type for a user."""
        if self.db._in_memory_mode:
            store = self.db._in_memory_store.get(self.CONTAINER_NAME, {})
            results = []
            for doc in store.values():
                if (doc.get('docType') == 'encrypted_data' and
                    doc.get('userId') == user_id and
                    doc.get('dataType') == data_type):
                    results.append(doc)
            return results

        results = self.db.query(
            self.CONTAINER_NAME,
            "SELECT * FROM c WHERE c.docType = 'encrypted_data' AND c.userId = @userId AND c.dataType = @dataType",
            [
                {'name': '@userId', 'value': user_id},
                {'name': '@dataType', 'value': data_type}
            ],
            partition_key=user_id
        )
        return results

    def get_encrypted_item(self, user_id: str, data_type: str, item_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific encrypted item."""
        doc_id = f"{data_type}_{user_id}_{item_id}"
        return self.db.get_by_id(self.CONTAINER_NAME, doc_id, user_id)

    def delete_encrypted_data(self, user_id: str, data_type: str) -> bool:
        """Delete all encrypted data of a specific type for a user."""
        try:
            items = self.get_encrypted_data(user_id, data_type)
            for item in items:
                self.db.delete(self.CONTAINER_NAME, item['id'], user_id)
            return True
        except Exception as e:
            logger.error(f"Failed to delete encrypted data: {e}")
            return False

    def delete_encrypted_item(self, user_id: str, data_type: str, item_id: str) -> bool:
        """Delete a specific encrypted item."""
        doc_id = f"{data_type}_{user_id}_{item_id}"
        return self.db.delete(self.CONTAINER_NAME, doc_id, user_id)

    def delete_all_user_data(self, user_id: str) -> bool:
        """Delete ALL encrypted data for a user (GDPR compliance)."""
        try:
            # Delete stepwork
            self.delete_encrypted_data(user_id, 'stepwork')
            # Delete chat
            self.delete_encrypted_data(user_id, 'chat')
            return True
        except Exception as e:
            logger.error(f"Failed to delete all user data: {e}")
            return False


# Convenience functions for creating repositories
def create_user_repository() -> UserRepository:
    """Create a UserRepository with default client"""
    return UserRepository(CosmosDBClient())


def create_step_work_repository() -> StepWorkRepository:
    """Create a StepWorkRepository with default client"""
    return StepWorkRepository(CosmosDBClient())


def create_encrypted_data_repository() -> EncryptedDataRepository:
    """Create an EncryptedDataRepository with default client"""
    return EncryptedDataRepository(CosmosDBClient())
