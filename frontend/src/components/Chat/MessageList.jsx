import React, { useEffect, useRef } from 'react';
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/outline';

const MessageList = ({ messages, loading, error }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  if (messages.length === 0 && !loading && !error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-8 bg-blue-gradient rounded-full flex items-center justify-center shadow-glow animate-bounce-gentle">
            <span className="text-3xl font-bold text-white animate-pulse-slow">🍳</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-6 animate-slide-up">Welcome to EasyRecipe!</h3>
          <p className="text-gray-600 leading-relaxed mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
            Enter your available ingredients and I'll suggest delicious recipes with nutritional information.<br/>
            Let's create something amazing together!
          </p>
          <div className="flex justify-center space-x-4 mt-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
            <button className="btn-secondary transform hover:scale-105 transition-all duration-300 shadow-card hover:shadow-card-hover">Quick recipes</button>
            <button className="btn-secondary transform hover:scale-105 transition-all duration-300 shadow-card hover:shadow-card-hover">Healthy options</button>
            <button className="btn-secondary transform hover:scale-105 transition-all duration-300 shadow-card hover:shadow-card-hover">Get started</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
      {error && (
        <div className="mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <CpuChipIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 bg-red-50/90 backdrop-blur-sm rounded-2xl p-5 border border-red-200/50 shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-600 text-lg animate-pulse">⚠️</span>
                <span className="text-red-700 font-semibold text-sm">Error</span>
              </div>
              <p className="text-red-700 leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {messages.map((message, index) => {
        const isUser = message.type === 'user' || message.sender === 'user';
        return (
          <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`} style={{animationDelay: `${index * 0.1}s`}}>
            <div className={`flex items-start gap-4 max-w-2xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-card transform hover:scale-110 transition-all duration-300 ${
                isUser ? 'bg-blue-gradient shadow-glow' : 'bg-white/90 backdrop-blur-sm border border-white/30'
              }`}>
                {isUser ? (
                  <UserIcon className="w-6 h-6 text-white" />
                ) : (
                  <CpuChipIcon className="w-6 h-6 text-gray-600" />
                )}
              </div>
              
              <div className={`message-bubble transform hover:scale-[1.02] transition-all duration-300 ${
                isUser ? 'message-user shadow-glow' : 'message-bot shadow-card hover:shadow-card-hover'
              }`}>
                {/* Render recipe content or regular text */}
                {!isUser && Array.isArray(message.content) ? (
                  <div className="space-y-6">
                    <p className="text-gray-700 font-medium mb-4">Here are some delicious recipes I found for you:</p>
                    {message.content.map((recipe, recipeIndex) => (
                      <div key={recipeIndex} className="bg-white/50 rounded-xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                        {/* Recipe Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-gradient rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {recipeIndex + 1}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">{recipe.name}</h3>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-1 rounded-full">{recipe.cookingTime}</span>
                            <span className={`px-2 py-1 rounded-full ${
                              recipe.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                              recipe.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>{recipe.difficulty}</span>
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                            Ingredients
                          </h4>
                          <div className="bg-gray-50/80 rounded-lg p-3">
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-gray-600">
                              {recipe.ingredients.map((ingredient, idx) => (
                                <li key={idx} className="flex items-center">
                                  <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                                  {ingredient}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Instructions */}
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                            Instructions
                          </h4>
                          <div className="space-y-2">
                            {recipe.instructions.map((instruction, idx) => (
                              <div key={idx} className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-semibold text-indigo-600">{idx + 1}</span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">{instruction}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Nutrition */}
                        {recipe.nutrition && (
                          <div className="border-t border-gray-200/50 pt-4">
                            <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                              Nutrition Information
                            </h4>
                            <div className="flex space-x-4 text-sm">
                              <div className="bg-blue-50 px-3 py-2 rounded-lg">
                                <span className="font-medium text-blue-700">Calories:</span>
                                <span className="ml-1 text-blue-600">{recipe.nutrition.calories}</span>
                              </div>
                              <div className="bg-green-50 px-3 py-2 rounded-lg">
                                <span className="font-medium text-green-700">Protein:</span>
                                <span className="ml-1 text-green-600">{recipe.nutrition.protein}</span>
                              </div>
                              <div className="bg-orange-50 px-3 py-2 rounded-lg">
                                <span className="font-medium text-orange-700">Carbs:</span>
                                <span className="ml-1 text-orange-600">{recipe.nutrition.carbs}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="leading-relaxed text-sm md:text-base">{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</p>
                )}
                
                <div className={`text-xs mt-3 flex items-center gap-2 ${
                  isUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span>{new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                  {isUser && <span className="w-1 h-1 bg-blue-200 rounded-full"></span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {loading && (
        <div className="mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/90 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center shadow-card animate-pulse-slow">
              <CpuChipIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/50 shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-gray-600 font-medium animate-pulse">Analyzing ingredients and creating recipes...</span>
              </div>
              <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-gradient animate-gradient-shift" style={{backgroundSize: '200% 100%'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;