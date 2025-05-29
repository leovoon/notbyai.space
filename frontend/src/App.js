import React, { useState, useEffect } from 'react';
import { ClerkProvider, SignIn, SignUp, SignedIn, SignedOut, UserButton, useAuth, useUser } from '@clerk/clerk-react';
import './App.css';
import axios from 'axios';

const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Main App wrapped with Clerk
function App() {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key")
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <MainApp />
    </ClerkProvider>
  );
}

// Main application component
function MainApp() {
  const [currentView, setCurrentView] = useState('feed');
  const [userRole, setUserRole] = useState('new_user');
  const { getToken } = useAuth();
  const { user } = useUser();

  // Sync user with backend on auth
  useEffect(() => {
    const syncUser = async () => {
      if (user) {
        try {
          const token = await getToken();
          const response = await axios.post(`${API}/auth/sync`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserRole(response.data.user.role);
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      }
    };
    syncUser();
  }, [user, getToken]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <SignedOut>
        <AuthPage />
      </SignedOut>
      <SignedIn>
        <div className="flex flex-col min-h-screen">
          <Header userRole={userRole} currentView={currentView} setCurrentView={setCurrentView} />
          <main className="flex-1 p-4">
            {currentView === 'feed' && <FeedView />}
            {currentView === 'create' && <CreatePostView />}
            {currentView === 'moderate' && userRole !== 'new_user' && <ModerationView />}
          </main>
        </div>
      </SignedIn>
    </div>
  );
}

// Authentication page
function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Not by AI.space</h1>
          <p className="text-gray-600">Authentic human connections in a curated space</p>
        </div>
        
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-center rounded-lg ${!isSignUp ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-center rounded-lg ${isSignUp ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Sign Up
            </button>
          </div>

          {isSignUp && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moderator Invite Code (Optional)
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank for regular user account
              </p>
            </div>
          )}

          <div className="clerk-auth-container">
            {isSignUp ? <SignUp /> : <SignIn />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Header component
function Header({ userRole, currentView, setCurrentView }) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Not by AI.space</h1>
        
        <nav className="flex space-x-6">
          <button
            onClick={() => setCurrentView('feed')}
            className={`px-4 py-2 rounded-lg ${currentView === 'feed' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Daily Feed
          </button>
          <button
            onClick={() => setCurrentView('create')}
            className={`px-4 py-2 rounded-lg ${currentView === 'create' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Create Post
          </button>
          {userRole !== 'new_user' && (
            <button
              onClick={() => setCurrentView('moderate')}
              className={`px-4 py-2 rounded-lg ${currentView === 'moderate' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Moderate
            </button>
          )}
        </nav>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 capitalize">{userRole.replace('_', ' ')}</span>
          <UserButton />
        </div>
      </div>
    </header>
  );
}

// Feed view component
function FeedView() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API}/feed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching feed:', error);
      setLoading(false);
    }
  };

  const handleResonate = async (postId) => {
    try {
      const token = await getToken();
      await axios.post(`${API}/posts/${postId}/resonate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFeed(); // Refresh to show updated counts
    } catch (error) {
      console.error('Error resonating:', error);
    }
  };

  const handleCherish = async (postId) => {
    try {
      const token = await getToken();
      await axios.post(`${API}/posts/${postId}/cherish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFeed(); // Refresh to show updated counts
    } catch (error) {
      console.error('Error cherishing:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading today's feed...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No posts yet today</h2>
        <p className="text-gray-600">Check back later for curated content!</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Today's Curated Feed</h2>
        <p className="text-gray-600">
          {posts.length} carefully selected {posts.length === 1 ? 'post' : 'posts'} for authentic human connection
        </p>
      </div>

      {posts.map((post, index) => (
        <div key={post.id} className="bg-white rounded-xl shadow-lg p-6 border">
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTagColor(post.tag)}`}>
              {post.tag}
            </span>
            <span className="text-sm text-gray-500">
              Post {index + 1} of {posts.length}
            </span>
          </div>
          
          <div className="prose max-w-none mb-6">
            <p className="text-gray-800 text-lg leading-relaxed">{post.content}</p>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex space-x-4">
              <button
                onClick={() => handleResonate(post.id)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors"
              >
                <span>✨</span>
                <span>Resonate ({post.resonates})</span>
              </button>
              <button
                onClick={() => handleCherish(post.id)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-700 transition-colors"
              >
                <span>💝</span>
                <span>Cherish ({post.cherishes})</span>
              </button>
            </div>
            <span className="text-sm text-gray-500">
              by {post.user_email}
            </span>
          </div>
        </div>
      ))}

      <div className="text-center py-8">
        <p className="text-gray-600">That's all for today! Come back tomorrow for more authentic content.</p>
      </div>
    </div>
  );
}

// Create post view
function CreatePostView() {
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState('Human2Human');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { getToken } = useAuth();

  const contentTags = [
    { value: 'Human2Human', label: 'Human2Human', description: 'Human to human connection' },
    { value: 'InnerWorld', label: 'InnerWorld', description: 'Subjective experience and qualia' },
    { value: 'WitSpark', label: 'WitSpark', description: 'Spontaneous humor and wit' },
    { value: 'DeepThought', label: 'DeepThought', description: 'Existential and philosophical insight' },
    { value: 'HeartLed', label: 'HeartLed', description: 'Empathy-driven decision making' },
    { value: 'CulturalSoul', label: 'CulturalSoul', description: 'Cultural and historical embodiment' },
    { value: 'AdaptFlow', label: 'AdaptFlow', description: 'Improvisational problem-solving' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = await getToken();
      await axios.post(`${API}/posts`, {
        content,
        tag: selectedTag
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('Post submitted successfully! It will be reviewed by moderators.');
      setContent('');
      setSelectedTag('Human2Human');
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Error creating post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Create Authentic Content</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Content Category
            </label>
            <div className="grid grid-cols-1 gap-3">
              {contentTags.map((tag) => (
                <label key={tag.value} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="tag"
                    value={tag.value}
                    checked={selectedTag === tag.value}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{tag.label}</div>
                    <div className="text-sm text-gray-500">{tag.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Authentic Expression
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              placeholder="Share something genuine, vulnerable, or deeply human. What's on your mind today?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              Daily limit: 3 posts • Focus on authenticity and vulnerability
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="w-full py-3 px-4 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

// Moderation view
function ModerationView() {
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { getToken } = useAuth();

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  const fetchPendingPosts = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API}/posts/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingPosts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      setLoading(false);
    }
  };

  const handleReview = async (postId, status) => {
    try {
      const token = await getToken();
      await axios.put(`${API}/posts/${postId}/review`, {
        status,
        reviewer_id: 'current_user'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`Post ${status} successfully`);
      fetchPendingPosts(); // Refresh list
    } catch (error) {
      setMessage('Error reviewing post');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading posts for review...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Moderation Queue</h2>
        <p className="text-gray-600">
          Review posts for authenticity, genuineness, and vulnerability
        </p>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-lg bg-green-100 text-green-700">
          {message}
        </div>
      )}

      {pendingPosts.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-900 mb-2">No pending posts</h3>
          <p className="text-gray-600">All posts have been reviewed!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-lg p-6 border">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTagColor(post.tag)}`}>
                  {post.tag}
                </span>
                <span className="text-sm text-gray-500">
                  by {post.user_email} • {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="prose max-w-none mb-6">
                <p className="text-gray-800 text-lg leading-relaxed">{post.content}</p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  <strong>Guidelines:</strong> Authenticity • Genuineness • Vulnerability
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleReview(post.id, 'rejected')}
                    className="px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReview(post.id, 'approved')}
                    className="px-4 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 font-medium transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function for tag colors
function getTagColor(tag) {
  const colors = {
    'Human2Human': 'bg-blue-100 text-blue-700',
    'InnerWorld': 'bg-purple-100 text-purple-700',
    'WitSpark': 'bg-yellow-100 text-yellow-700',
    'DeepThought': 'bg-indigo-100 text-indigo-700',
    'HeartLed': 'bg-pink-100 text-pink-700',
    'CulturalSoul': 'bg-green-100 text-green-700',
    'AdaptFlow': 'bg-orange-100 text-orange-700',
  };
  return colors[tag] || 'bg-gray-100 text-gray-700';
}

export default App;
