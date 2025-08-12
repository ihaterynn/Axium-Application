import os
from typing import List, Optional, Dict, Any
from models import RecipeChatRecord
import json
from datetime import datetime
import uuid
from supabase import create_client, Client

class DatabaseManager:
    """Manages database operations with Supabase"""
    
    def __init__(self):
        # Initialize Supabase client
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            print("⚠️  Warning: Supabase credentials not found, falling back to in-memory storage")
            self.client = None
            self.chats: Dict[str, RecipeChatRecord] = {}
        else:
            try:
                self.client: Client = create_client(supabase_url, supabase_key)
                print("📊 Connected to Supabase database")
            except Exception as e:
                print(f"❌ Failed to connect to Supabase: {e}")
                print("📊 Falling back to in-memory storage")
                self.client = None
                self.chats: Dict[str, RecipeChatRecord] = {}
    
    async def save_recipe_chat(self, session_id: str, ingredients: str, recipes: List[Dict[str, Any]], title: str = "Recipe Analysis") -> Optional[str]:
        """Save a recipe chat to the database"""
        try:
            chat_id = str(uuid.uuid4())
            
            if self.client:
                # Use Supabase
                result = self.client.table('recipe_chats').insert({
                    'id': chat_id,
                    'session_id': session_id,
                    'title': title,
                    'ingredients': ingredients,
                    'recipes_json': {'recipes': recipes}
                }).execute()
                
                if result.data:
                    return chat_id
                else:
                    print(f"Failed to save to Supabase: {result}")
                    return None
            else:
                # Fallback to in-memory storage
                chat_record = RecipeChatRecord(
                    id=chat_id,
                    session_id=session_id,
                    title=title,
                    ingredients=ingredients,
                    recipes_json={'recipes': recipes},
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                self.chats[chat_id] = chat_record
                return chat_id
            
        except Exception as e:
            print(f"Error saving recipe chat: {e}")
            return None
    
    async def get_session_chats(self, session_id: str) -> List[RecipeChatRecord]:
        """Get all chats for a specific session"""
        try:
            if self.client:
                # Use Supabase
                result = self.client.table('recipe_chats').select('*').eq('session_id', session_id).order('created_at', desc=True).execute()
                
                chats = []
                for row in result.data:
                    chat = RecipeChatRecord(
                        id=row['id'],
                        session_id=row['session_id'],
                        title=row.get('title', 'Recipe Analysis'),
                        ingredients=row['ingredients'],
                        recipes_json=row['recipes_json'],
                        created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')),
                        updated_at=datetime.fromisoformat(row['updated_at'].replace('Z', '+00:00')) if row['updated_at'] else None
                    )
                    chats.append(chat)
                
                return chats
            else:
                # Fallback to in-memory storage
                chats = [chat for chat in self.chats.values() if chat.session_id == session_id]
                # Sort by created_at descending
                chats.sort(key=lambda x: x.created_at, reverse=True)
                return chats
            
        except Exception as e:
            print(f"Error getting session chats: {e}")
            return []
    
    async def get_recent_chats(self, limit: int = 50) -> List[RecipeChatRecord]:
        """Get recent chats across all sessions"""
        try:
            result = self.client.table('recipe_chats').select('*').order('created_at', desc=True).limit(limit).execute()
            
            chats = []
            for row in result.data:
                chat = RecipeChatRecord(
                    id=row['id'],
                    session_id=row['session_id'],
                    title=row.get('title', 'Recipe Analysis'),
                    ingredients=row['ingredients'],
                    recipes_json=row['recipes_json'],
                    created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')),
                    updated_at=datetime.fromisoformat(row['updated_at'].replace('Z', '+00:00')) if row['updated_at'] else None
                )
                chats.append(chat)
            
            return chats
            
        except Exception as e:
            print(f"Error getting recent chats: {e}")
            return []
    
    async def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Get all unique sessions with their latest chat info"""
        try:
            if self.client:
                # Get distinct session_ids with their latest chat info
                result = self.client.table('recipe_chats').select('session_id, title, created_at').order('created_at', desc=True).execute()
                
                # Group by session_id and get the latest for each
                sessions_dict = {}
                for row in result.data:
                    session_id = row['session_id']
                    created_at = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
                    title = row.get('title', 'Recipe Analysis')
                    
                    if session_id not in sessions_dict or created_at > sessions_dict[session_id]['created_at']:
                        sessions_dict[session_id] = {
                            'id': session_id,
                            'name': title,
                            'created_at': created_at
                        }
                
                # Convert to list and sort by creation date
                sessions = list(sessions_dict.values())
                sessions.sort(key=lambda x: x['created_at'], reverse=True)
                
                # Convert datetime to ISO string for JSON serialization
                for session in sessions:
                    session['createdAt'] = session['created_at'].isoformat()
                    del session['created_at']
                
                return sessions
            else:
                # Fallback to in-memory storage
                session_ids = set(chat.session_id for chat in self.chats.values())
                sessions = []
                for i, session_id in enumerate(session_ids):
                    sessions.append({
                        'id': session_id,
                        'name': f'Recipe Analysis {i + 1}',
                        'createdAt': datetime.now().isoformat()
                    })
                return sessions
                
        except Exception as e:
            print(f"Error getting all sessions: {e}")
            return []
    
    async def delete_chat(self, chat_id: str) -> bool:
        """Delete a specific chat"""
        try:
            result = self.client.table('recipe_chats').delete().eq('id', chat_id).execute()
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error deleting chat: {e}")
            return False
    
    async def delete_session_chats(self, session_id: str) -> bool:
        """Delete all chats for a specific session"""
        try:
            result = self.client.table('recipe_chats').delete().eq('session_id', session_id).execute()
            return True
            
        except Exception as e:
            print(f"Error deleting session chats: {e}")
            return False
    
    async def update_chat(self, chat_id: str, ingredients: str = None, recipes: List[Dict[str, Any]] = None) -> bool:
        """Update an existing chat"""
        try:
            update_data = {}
            
            if ingredients is not None:
                update_data['ingredients'] = ingredients
            
            if recipes is not None:
                update_data['recipes_json'] = {'recipes': recipes}
            
            if not update_data:
                return False
            
            result = self.client.table('recipe_chats').update(update_data).eq('id', chat_id).execute()
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error updating chat: {e}")
            return False
    
    async def update_session_title(self, session_id: str, title: str) -> bool:
        """Update the title for all chats in a session"""
        try:
            if self.client:
                result = self.client.table('recipe_chats').update({'title': title}).eq('session_id', session_id).execute()
                return len(result.data) > 0
            else:
                # Fallback to in-memory storage
                updated = False
                for chat in self.chats.values():
                    if chat.session_id == session_id:
                        chat.title = title
                        updated = True
                return updated
            
        except Exception as e:
            print(f"Error updating session title: {e}")
            return False
    
    async def get_chat_by_id(self, chat_id: str) -> Optional[RecipeChatRecord]:
        """Get a specific chat by ID"""
        try:
            result = self.client.table('recipe_chats').select('*').eq('id', chat_id).execute()
            
            if result.data:
                row = result.data[0]
                return RecipeChatRecord(
                    id=row['id'],
                    session_id=row['session_id'],
                    title=row.get('title', 'Recipe Analysis'),
                    ingredients=row['ingredients'],
                    recipes_json=row['recipes_json'],
                    created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')),
                    updated_at=datetime.fromisoformat(row['updated_at'].replace('Z', '+00:00')) if row['updated_at'] else None
                )
            
            return None
            
        except Exception as e:
            print(f"Error getting chat by ID: {e}")
            return None
    
    async def health_check(self) -> bool:
        """Check database connection health"""
        try:
            if self.client:
                # Test Supabase connection with a simple query
                result = self.client.table('recipe_chats').select('count', count='exact').limit(1).execute()
                return True
            else:
                # Simple check for in-memory storage
                return isinstance(self.chats, dict)
            
        except Exception as e:
            print(f"Database health check failed: {e}")
            return False

# Global database manager instance
db_manager = None

def get_database_manager() -> DatabaseManager:
    """Get or create database manager instance"""
    global db_manager
    if db_manager is None:
        db_manager = DatabaseManager()
    return db_manager