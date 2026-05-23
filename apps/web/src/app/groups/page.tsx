'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { Users, Send, Plus, Search, MessageSquare, ArrowLeft, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmails, setNewGroupEmails] = useState('');
  
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const wsHost = apiHost.replace('http', 'ws');

  // Fetch User and Groups on mount
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (!token) return router.push('/login');

      // Get me
      const meRes = await fetch(`${apiHost}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const meData = await meRes.json();
      if (meData.status === 'success') setCurrentUser(meData.user);

      // Get groups
      const res = await fetch(`${apiHost}/api/groups`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') setGroups(data.groups);
    };
    init();
  }, []);

  // Initialize WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    ws.current = new WebSocket(`${wsHost}/ws`);
    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'auth_success' && activeGroupId) {
        ws.current?.send(JSON.stringify({ type: 'subscribe', groupId: activeGroupId }));
      }
      if (data.type === 'chat_message') {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  // Change active group
  useEffect(() => {
    if (!activeGroupId) return;
    const fetchMessages = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiHost}/api/groups/${activeGroupId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessages(data.messages);
      }
    };
    fetchMessages();
    
    // Subscribe to ws room
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'subscribe', groupId: activeGroupId }));
    }
  }, [activeGroupId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const emails = newGroupEmails.split(',').map(e => e.trim()).filter(e => e);
    
    const res = await fetch(`${apiHost}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newGroupName, memberEmails: emails })
    });
    
    const data = await res.json();
    if (data.status === 'success') {
      setGroups(prev => [...prev, data.group]);
      setIsCreating(false);
      setNewGroupName('');
      setNewGroupEmails('');
      setActiveGroupId(data.group._id);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGroupId || !ws.current) return;

    ws.current.send(JSON.stringify({
      type: 'chat_message',
      groupId: activeGroupId,
      text: newMessage
    }));
    
    setNewMessage('');
  };

  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberEmails, setAddMemberEmails] = useState('');

  // Determine what's shown on mobile:
  // - If creating: show the create form full screen
  // - If activeGroupId: show the chat full screen
  // - Otherwise: show the groups list
  const showChatPanel = activeGroupId || isCreating;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId) return;

    const token = localStorage.getItem('token');
    const emails = addMemberEmails.split(',').map(e => e.trim()).filter(e => e);
    
    if (emails.length === 0) return;

    try {
      const res = await fetch(`${apiHost}/api/groups/${activeGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberEmails: emails })
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        // Update local group members count/data
        setGroups(prev => prev.map(g => g._id === activeGroupId ? data.group : g));
        setIsAddingMember(false);
        setAddMemberEmails('');
        alert(data.message);
      } else {
        alert(data.message || 'Failed to add members');
      }
    } catch (error) {
      console.error(error);
      alert('Error adding members');
    }
  };

  return (
    <AppLayout title="My Groups">
      <div className="h-[calc(100vh-140px)] flex gap-6">
        
        {/* Left Sidebar (Groups List) — hidden on mobile when chat/create is active */}
        <div className={`w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col ${showChatPanel ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">Conversations</h2>
            <button 
              onClick={() => { setIsCreating(true); setActiveGroupId(null); }}
              className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {groups.map(group => (
              <div 
                key={group._id} 
                onClick={() => { setActiveGroupId(group._id); setIsCreating(false); }}
                className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-colors ${activeGroupId === group._id ? 'bg-[#E8642C]/10 border border-[#E8642C]/20' : 'hover:bg-gray-50 border border-transparent'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${activeGroupId === group._id ? 'bg-[#E8642C] text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h3 className={`font-semibold text-sm truncate ${activeGroupId === group._id ? 'text-[#E8642C]' : 'text-gray-900'}`}>{group.name}</h3>
                  <p className="text-xs text-gray-400">{group.members?.length || 1} members</p>
                </div>
              </div>
            ))}
            {groups.length === 0 && !isCreating && (
              <div className="text-center p-8 text-gray-400 text-sm">
                No groups yet. Click + to create one.
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Area — shown on mobile when chat/create is active */}
        <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col relative overflow-hidden ${!showChatPanel ? 'hidden md:flex' : 'flex'}`}>
          {isCreating ? (
            <div className="flex flex-col h-full">
              {/* Mobile back button */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 md:hidden">
                <button onClick={() => setIsCreating(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-gray-900">Create New Group</h3>
              </div>
              <div className="p-8 max-w-md mx-auto w-full my-auto">
                <h2 className="text-2xl font-bold mb-6 text-center hidden md:block">Create New Group</h2>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Group Name</label>
                    <input required value={newGroupName} onChange={e => setNewGroupName(e.target.value)} type="text" className="w-full p-3 rounded-xl border border-gray-200" placeholder="e.g. Science Teachers" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Add Members (Emails)</label>
                    <input value={newGroupEmails} onChange={e => setNewGroupEmails(e.target.value)} type="text" className="w-full p-3 rounded-xl border border-gray-200" placeholder="teacher1@school.edu, teacher2@..." />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
                    <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-[#E8642C] hover:bg-[#d9561f]">Create Group</button>
                  </div>
                </form>
              </div>
            </div>
          ) : !activeGroupId ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a group to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 bg-white z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveGroupId(null)}
                    className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-bold text-gray-900">{groups.find(g => g._id === activeGroupId)?.name}</h3>
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsAddingMember(!isAddingMember)}
                    className="flex items-center gap-2 text-sm font-semibold text-[#E8642C] bg-[#E8642C]/10 px-3 py-1.5 rounded-full hover:bg-[#E8642C]/20 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Member</span>
                  </button>
                  
                  {isAddingMember && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
                      <h4 className="font-bold text-gray-900 mb-2">Add to Group</h4>
                      <form onSubmit={handleAddMember}>
                        <input 
                          type="text" 
                          value={addMemberEmails}
                          onChange={e => setAddMemberEmails(e.target.value)}
                          placeholder="Emails (comma separated)" 
                          className="w-full text-sm p-2 rounded-lg border border-gray-200 mb-3 focus:outline-none focus:border-[#E8642C]"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setIsAddingMember(false)} className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">Cancel</button>
                          <button type="submit" className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-[#E8642C] text-white hover:bg-[#d9561f]">Add</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#F2F2F2]/50 space-y-4">
                {messages.map(msg => {
                  const isMe = msg.senderId?._id === currentUser?.id || msg.senderId === currentUser?.id;
                  return (
                    <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-gray-400 mb-1 px-1">{isMe ? 'You' : msg.senderId?.name}</span>
                      <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? 'bg-[#E8642C] text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..." 
                    className="flex-1 py-3 pl-4 pr-12 rounded-full border border-gray-200 focus:outline-none focus:border-[#E8642C] bg-gray-50"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#E8642C] text-white rounded-full hover:bg-[#d9561f]">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
