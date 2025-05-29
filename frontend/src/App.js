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
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  // Sync user with backend on auth
  useEffect(() => {
    const syncUser = async () => {
      if (user && isSignedIn) {
        try {
          setIsLoading(true);
          setAuthError('');
          const token = await getToken();
          console.log('Syncing user with backend...');
          
          const response = await axios.post(`${API}/auth/sync`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setUserRole(response.data.user.role);
          console.log('User synced successfully:', response.data.user);
          setIsLoading(false);
        } catch (error) {
          console.error('Error syncing user:', error);
          setAuthError(`Authentication sync failed: ${error.response?.data?.detail || error.message}`);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    syncUser();
  }, [user, isSignedIn, getToken]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <SignedOut>
        <AuthPage />
      </SignedOut>
      <SignedIn>
        {authError ? (
          <ErrorPage error={authError} onRetry={() => window.location.reload()} />
        ) : (
          <div className="flex flex-col min-h-screen">
            <Header userRole={userRole} currentView={currentView} setCurrentView={setCurrentView} />
            <main className="flex-1 p-4">
              {currentView === 'feed' && <FeedView />}
              {currentView === 'create' && <CreatePostView />}
              {currentView === 'moderate' && userRole !== 'new_user' && <ModerationView />}
              {currentView === 'profile' && <ProfileView userRole={userRole} />}
            </main>
          </div>
        )}
      </SignedIn>
    </div>
  );
}

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Not by AI.space</h2>
        <p className="text-gray-600">Connecting you to authentic human content...</p>
      </div>
    </div>
  );
}

// Error page component
function ErrorPage({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-md w-full text-center p-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onRetry}
            className="w-full py-3 px-4 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// Authentication page
function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteInput, setShowInviteInput] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🧠</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Not by AI.space</h1>
          <p className="text-gray-600 mb-6">Authentic human connections in a curated space</p>
          <div className="bg-purple-100 rounded-lg p-4 text-sm text-purple-800 mb-6">
            <strong>Platform Values:</strong> Authenticity • Vulnerability • Genuine Human Expression
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-center rounded-lg transition-colors ${!isSignUp ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-center rounded-lg transition-colors ${isSignUp ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Sign Up
            </button>
          </div>

          {isSignUp && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Special Access
                </label>
                <button
                  onClick={() => setShowInviteInput(!showInviteInput)}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  {showInviteInput ? 'Hide' : 'Have an invite code?'}
                </button>
              </div>
              
              {showInviteInput && (
                <>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter moderator invite code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Moderator invite codes grant special platform privileges
                  </p>
                </>
              )}
            </div>
          )}

          <div className="clerk-auth-container">
            {isSignUp ? <SignUp /> : <SignIn />}
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>By joining, you commit to sharing authentic, vulnerable content</p>
        </div>
      </div>
    </div>
  );
}

// Header component with improved design
function Header({ userRole, currentView, setCurrentView }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-2xl">🧠</div>
          <h1 className="text-2xl font-bold text-gray-900">Not by AI.space</h1>
        </div>
        
        <nav className="hidden md:flex space-x-6">
          <NavButton 
            label="Daily Feed" 
            isActive={currentView === 'feed'}
            onClick={() => setCurrentView('feed')}
            icon="📰"
          />
          <NavButton 
            label="Create Post" 
            isActive={currentView === 'create'}
            onClick={() => setCurrentView('create')}
            icon="✍️"
          />
          {userRole !== 'new_user' && (
            <NavButton 
              label="Moderate" 
              isActive={currentView === 'moderate'}
              onClick={() => setCurrentView('moderate')}
              icon="⚖️"
            />
          )}
          <NavButton 
            label="Profile" 
            isActive={currentView === 'profile'}
            onClick={() => setCurrentView('profile')}
            icon="👤"
          />
        </nav>
        
        <div className="flex items-center space-x-4">
          <RoleBadge role={userRole} />
          <UserButton />
        </div>
      </div>
    </header>
  );
}

// Navigation button component
function NavButton({ label, isActive, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-purple-600 text-white' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Role badge component
function RoleBadge({ role }) {
  const roleConfig = {
    new_user: { label: 'Member', color: 'bg-blue-100 text-blue-700', icon: '👤' },
    moderator: { label: 'Moderator', color: 'bg-green-100 text-green-700', icon: '⚖️' },
    seed_user: { label: 'Seed User', color: 'bg-purple-100 text-purple-700', icon: '🌱' }
  };

  const config = roleConfig[role] || roleConfig.new_user;

  return (
    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}

// Feed view component with enhanced swiping interface
function FeedView() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState('');
  const [feedComplete, setFeedComplete] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      // For demo purposes, create some mock posts to show the interface
      const mockPosts = [
        {
          id: '1',
          content: 'Today I realized that vulnerability isn\'t weakness—it\'s the birthplace of courage. Sharing our struggles connects us more deeply than our successes ever could.',
          tag: 'InnerWorld',
          resonates: 12,
          cherishes: 8,
          user_email: 'sarah@example.com'
        },
        {
          id: '2', 
          content: 'Watched my grandmother teach my daughter how to bake her famous cookies. Three generations sharing the same recipe, the same laughter, the same love. Some things transcend time.',
          tag: 'CulturalSoul',
          resonates: 24,
          cherishes: 18,
          user_email: 'mike@example.com'
        },
        {
          id: '3',
          content: 'Had a conversation with a stranger at the coffee shop today. We ended up talking for an hour about our dreams. Sometimes the most profound connections happen with people we may never see again.',
          tag: 'Human2Human',
          resonates: 15,
          cherishes: 11,
          user_email: 'alex@example.com'
        }
      ];
      
      setPosts(mockPosts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching feed:', error);
      setLoading(false);
    }
  };

  const handleSwipe = (direction) => {
    setSwipeDirection(direction);
    setTimeout(() => {
      if (currentIndex < posts.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setFeedComplete(true);
      }
      setSwipeDirection('');
    }, 300);
  };

  const handleResonate = async (postId) => {
    try {
      // Update local state immediately for better UX
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, resonates: post.resonates + 1 }
          : post
      ));
      
      // Handle swipe after interaction
      setTimeout(() => handleSwipe('right'), 500);
    } catch (error) {
      console.error('Error resonating:', error);
    }
  };

  const handleCherish = async (postId) => {
    try {
      // Update local state immediately for better UX
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, cherishes: post.cherishes + 1 }
          : post
      ));
      
      // Handle swipe after interaction
      setTimeout(() => handleSwipe('right'), 500);
    } catch (error) {
      console.error('Error cherishing:', error);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setFeedComplete(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading today's curated feed...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No posts yet today</h2>
        <p className="text-gray-600">Check back later for curated authentic content!</p>
      </div>
    );
  }

  if (feedComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-4">✨</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">That's all for today!</h2>
        <p className="text-gray-600 mb-6">
          You've experienced all {posts.length} carefully curated posts for today.
        </p>
        <div className="space-y-4">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setFeedComplete(false);
            }}
            className="w-full py-3 px-4 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
          >
            Review Today's Posts Again
          </button>
          <p className="text-sm text-gray-500">
            Come back tomorrow for new authentic content
          </p>
        </div>
      </div>
    );
  }

  const currentPost = posts[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Post {currentIndex + 1} of {posts.length}
          </span>
          <span className="text-sm text-gray-500">Today's Feed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / posts.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Swipeable post card */}
      <div className="relative h-96">
        <div 
          className={`absolute inset-0 transform transition-transform duration-300 ${
            swipeDirection === 'left' ? '-translate-x-full opacity-0' :
            swipeDirection === 'right' ? 'translate-x-full opacity-0' : ''
          }`}
        >
          <PostCard 
            post={currentPost}
            onResonate={handleResonate}
            onCherish={handleCherish}
          />
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>←</span>
          <span>Previous</span>
        </button>

        <div className="flex space-x-4">
          <button
            onClick={() => handleResonate(currentPost.id)}
            className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors font-medium"
          >
            <span>✨</span>
            <span>Resonate ({currentPost.resonates})</span>
          </button>
          <button
            onClick={() => handleCherish(currentPost.id)}
            className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-700 transition-colors font-medium"
          >
            <span>💝</span>
            <span>Cherish ({currentPost.cherishes})</span>
          </button>
        </div>

        <button
          onClick={() => handleSwipe('right')}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <span>Skip</span>
          <span>→</span>
        </button>
      </div>

      {/* Swipe hint */}
      {currentIndex === 0 && (
        <div className="text-center mt-4 text-sm text-gray-500">
          <p>💡 Tip: Use the buttons to interact with posts or navigate between them</p>
        </div>
      )}
    </div>
  );
}

// Post card component
function PostCard({ post, onResonate, onCherish }) {
  return (
    <div className="h-full bg-white rounded-xl shadow-lg p-6 border flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTagColor(post.tag)}`}>
          {post.tag}
        </span>
        <span className="text-sm text-gray-500">
          by {post.user_email}
        </span>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-800 text-lg leading-relaxed text-center">{post.content}</p>
      </div>
      
      <div className="flex items-center justify-center space-x-6 pt-4 border-t">
        <div className="flex items-center space-x-1 text-purple-600">
          <span>✨</span>
          <span className="text-sm">{post.resonates}</span>
        </div>
        <div className="flex items-center space-x-1 text-pink-600">
          <span>💝</span>
          <span className="text-sm">{post.cherishes}</span>
        </div>
      </div>
    </div>
  );
}

// Profile view component
function ProfileView({ userRole }) {
  const [stats, setStats] = useState({
    postsToday: 0,
    totalPosts: 0,
    totalResonates: 0,
    totalCherishes: 0
  });

  const avatarOptions = [
    '🌸', '🌿', '🌊', '🌙', '⭐', '🦋', '🍃'
  ];

  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{selectedAvatar}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Profile</h2>
          <RoleBadge role={userRole} />
        </div>

        {/* Avatar selection */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Your Avatar</h3>
          <div className="grid grid-cols-7 gap-4">
            {avatarOptions.map((avatar, index) => (
              <button
                key={index}
                onClick={() => setSelectedAvatar(avatar)}
                className={`text-3xl p-3 rounded-lg border-2 transition-colors ${
                  selectedAvatar === avatar 
                    ? 'border-purple-600 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Posts Today" value={`${stats.postsToday}/3`} />
          <StatCard title="Total Posts" value={stats.totalPosts} />
          <StatCard title="Resonates Earned" value={stats.totalResonates} />
          <StatCard title="Cherishes Earned" value={stats.totalCherishes} />
        </div>

        {/* Daily posting guidance */}
        <div className="mt-8 p-4 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">✍️ Daily Posting Guidelines</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Share authentic, vulnerable experiences</li>
            <li>• Maximum 3 posts per day to maintain quality</li>
            <li>• Focus on genuine human connection</li>
            <li>• All posts reviewed for authenticity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ title, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
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
