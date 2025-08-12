import os
import json
from typing import List, Dict, Any, Optional
from models import Recipe, NutritionInfo
import re
from huggingface_hub import InferenceClient

class AIService:
    """Handles AI recipe generation using HuggingFace Inference API"""
    
    def __init__(self):
        self.api_token = os.getenv('HUGGINGFACE_API_TOKEN')
        self.model_name = os.getenv('HUGGINGFACE_MODEL_NAME', 'microsoft/DialoGPT-medium')
        
        if not self.api_token:
            raise ValueError("HuggingFace API token must be set in environment variables")
        
        # Initialize the InferenceClient with the token
        self.client = InferenceClient(token=self.api_token)
    
    def _create_recipe_prompt(self, ingredients: str) -> str:
        """Create a structured prompt for recipe generation"""
        prompt = f"""You are a professional chef and recipe creator. Given the following ingredients: {ingredients}

Create 2-3 delicious recipes using these ingredients. For each recipe, provide:

1. Recipe Name
2. Complete ingredient list (including quantities)
3. Step-by-step cooking instructions
4. Estimated cooking time
5. Difficulty level (Easy/Medium/Hard)
6. Nutritional information (calories, protein, carbs)

Format your response as a JSON array with this structure:
[
  {{
    "name": "Recipe Name",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "cookingTime": "30 minutes",
    "difficulty": "Easy",
    "nutrition": {{
      "calories": 350,
      "protein": "15g",
      "carbs": "45g"
    }}
  }}
]

Provide only the JSON response, no additional text."""
        return prompt
    
    def _parse_ai_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse AI response and extract recipe JSON"""
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                recipes_data = json.loads(json_str)
                return recipes_data
            
            # If no JSON found, try to parse the entire response
            recipes_data = json.loads(response_text)
            return recipes_data
            
        except json.JSONDecodeError:
            # Fallback: create a simple recipe from the text
            return self._create_fallback_recipe(response_text)
    
    def _create_fallback_recipe(self, response_text: str) -> List[Dict[str, Any]]:
        """Create a fallback recipe when JSON parsing fails"""
        return [{
            "name": "AI Generated Recipe",
            "ingredients": ["Follow the ingredients you provided"],
            "instructions": [response_text[:500] + "..." if len(response_text) > 500 else response_text],
            "cookingTime": "30 minutes",
            "difficulty": "Medium",
            "nutrition": {
                "calories": 300,
                "protein": "12g",
                "carbs": "35g"
            }
        }]
    
    def _validate_and_fix_recipe(self, recipe_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and fix recipe data structure"""
        # Ensure required fields exist
        recipe_data.setdefault('name', 'Unnamed Recipe')
        recipe_data.setdefault('ingredients', ['No ingredients specified'])
        recipe_data.setdefault('instructions', ['No instructions provided'])
        recipe_data.setdefault('cookingTime', '30 minutes')
        recipe_data.setdefault('difficulty', 'Medium')
        
        # Ensure nutrition info exists
        if 'nutrition' not in recipe_data or not isinstance(recipe_data['nutrition'], dict):
            recipe_data['nutrition'] = {
                'calories': 300,
                'protein': '12g',
                'carbs': '35g'
            }
        
        # Ensure lists are actually lists
        if not isinstance(recipe_data['ingredients'], list):
            recipe_data['ingredients'] = [str(recipe_data['ingredients'])]
        
        if not isinstance(recipe_data['instructions'], list):
            recipe_data['instructions'] = [str(recipe_data['instructions'])]
        
        return recipe_data
    
    async def generate_recipes(self, ingredients: str) -> List[Recipe]:
        """Generate recipes using AI based on provided ingredients"""
        try:
            prompt = self._create_recipe_prompt(ingredients)
            
            # Use conversational mode for Mistral model
            try:
                # Try with the Mistral model in conversational mode
                messages = [{"role": "user", "content": prompt}]
                response = self.client.chat_completion(
                    messages=messages,
                    model=self.model_name,
                    max_tokens=1000,
                    temperature=0.7
                )
                generated_text = response.choices[0].message.content
            except Exception as e:
                print(f"Primary model failed, trying fallback: {e}")
                # Fallback to a simpler approach
                generated_text = f"Here's a simple recipe using {ingredients}: Mix all ingredients together and cook for 20 minutes."
            
            # Parse the AI response
            recipes_data = self._parse_ai_response(generated_text)
                
            # Validate and convert to Recipe objects
            recipes = []
            for recipe_data in recipes_data:
                try:
                    # Validate and fix recipe data
                    fixed_recipe = self._validate_and_fix_recipe(recipe_data)
                    
                    # Create Recipe object
                    nutrition = NutritionInfo(**fixed_recipe['nutrition'])
                    recipe = Recipe(
                        name=fixed_recipe['name'],
                        ingredients=fixed_recipe['ingredients'],
                        instructions=fixed_recipe['instructions'],
                        cookingTime=fixed_recipe['cookingTime'],
                        difficulty=fixed_recipe['difficulty'],
                        nutrition=nutrition
                    )
                    recipes.append(recipe)
                    
                except Exception as e:
                    print(f"Error creating recipe object: {e}")
                    continue
            
            # Ensure we have at least one recipe
            if not recipes:
                recipes = self._create_default_recipes(ingredients)
            
            return recipes
                
        except Exception as e:
            print(f"Error generating recipes: {e}")
            return self._create_default_recipes(ingredients)
    
    def _create_default_recipes(self, ingredients: str) -> List[Recipe]:
        """Create default recipes when AI generation fails"""
        ingredient_list = [ing.strip() for ing in ingredients.split(',')]
        
        nutrition = NutritionInfo(
            calories=350,
            protein="15g",
            carbs="45g"
        )
        
        recipe = Recipe(
            name=f"Simple {ingredient_list[0].title()} Recipe",
            ingredients=ingredient_list + ["Salt", "Pepper", "Olive oil"],
            instructions=[
                "Prepare all ingredients by washing and chopping as needed.",
                "Heat olive oil in a large pan over medium heat.",
                f"Add {ingredient_list[0]} and cook for 5-7 minutes.",
                "Season with salt and pepper to taste.",
                "Add remaining ingredients and cook until tender.",
                "Serve hot and enjoy!"
            ],
            cookingTime="25 minutes",
            difficulty="Easy",
            nutrition=nutrition
        )
        
        return [recipe]
    
    async def health_check(self) -> bool:
        """Check AI service health"""
        try:
            # Simple test request using conversational mode
            messages = [{"role": "user", "content": "Test"}]
            test_response = self.client.chat_completion(
                messages=messages,
                model=self.model_name,
                max_tokens=10,
                temperature=0.5
            )
            
            return test_response is not None and test_response.choices
            
        except Exception as e:
            print(f"AI service health check failed: {e}")
            return False

# Global AI service instance
ai_service = None

def get_ai_service() -> AIService:
    """Get or create AI service instance"""
    global ai_service
    if ai_service is None:
        ai_service = AIService()
    return ai_service