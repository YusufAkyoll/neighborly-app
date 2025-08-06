/**
 * App.tsx
 *
 * Neighborly social app:
 * - Map view
 * - Post sharing (text & voice)
 * - Emergency alert button
 * - Moderator dashboard
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { FaPlay, FaPause } from "react-icons/fa";

import AudioRecorderPolyfill from 'audio-recorder-polyfill';

import { MapContainer, TileLayer, Marker, Popup, } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// --- TYPE DEFINITIONS --- //

interface User {
  id: number;
  name: string;
  avatar: string;
  isVerified: boolean;
  bio: string;
  location: {
    top: number;
    left: number;
  };
}

type PostType = 'text' | 'voice';

interface Post {
  id: number;
  authorId: number;
  type: PostType;
  content: string;
  timestamp: string;
  reactions: Record<string, number>;
  isReported: boolean;
}

// --- MOCK DATA --- //

const mockUsers: User[] = [
  {
    id: 1,
    name: 'You',
    avatar: 'https://i.pravatar.cc/150?u=1',
    isVerified: true,
    bio: 'Just trying to keep the neighborhood safe and friendly!',
    location: { top: 52.3676, left: 4.9041 },
  },
  {
    id: 2,
    name: 'Alice',
    avatar: 'https://i.pravatar.cc/150?u=3',
    isVerified: true,
    bio: 'Loves gardening and sharing fresh produce.',
    location: { top: 52.3695, left: 4.9000 },
  },
  {
    id: 3,
    name: 'Bob',
    avatar: 'https://i.pravatar.cc/150?u=2',
    isVerified: false,
    bio: 'Local handyman. Happy to help with small repairs.',
    location: { top: 52.3660, left: 4.9100 },
  },
  {
    id: 4,
    name: 'Charlie',
    avatar: 'https://i.pravatar.cc/150?u=4',
    isVerified: true,
    bio: 'Dog walker and pet sitter available on weekends.',
    location: { top: 52.3702, left: 4.9150 },
  },
];

const center: [number, number] = [52.3676, 4.9041];

const mockPosts: Post[] = [
  {
    id: 1,
    authorId: 2,
    type: 'text',
    content: "I have extra tomatoes from my garden! Anyone want some? They're on my porch.",
    timestamp: '2 hours ago',
    reactions: { '👍': 5, '😂': 3 },
    isReported: false,
  },
  {
    id: 2,
    authorId: 3,
    type: 'text',
    content: 'I hate people!',
    timestamp: 'Yesterday',
    reactions: { '👎': 7, '😂': 2 },
    isReported: false,
  },
  {
    id: 3,
    authorId: 4,
    type: 'text',
    content: "Found a lost cat near Oak Street. It's a friendly tabby with a blue collar. Let me know if it's yours!",
    timestamp: '3 days ago',
    reactions: { '😢': 2, '😂': 8, '👍': 4 },
    isReported: false,
  },
  {
    id: 4,
    authorId: 3,
    type: 'text',
    content: 'I dont belong here!',
    timestamp: 'Yesterday',
    reactions: { '👎': 9, '😂': 4 },
    isReported: true,
  },
];

const createAvatarIcon = (avatarUrl: string, isVerified: boolean) =>
  L.divIcon({
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    className: "",
    html: `
      <div style="position: relative; width: 48px; height: 48px;">
        <img src="${avatarUrl}" style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid #de5c50; box-shadow: 0 2px 4px rgba(0,0,0,0.3);" />
        ${isVerified
        ? `<div style="position: absolute; bottom: -2px; right: -2px; background: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 24 24" fill="#1d9bf0" width="14" height="14">
                  <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.33c-.46 1.4-.2 2.91.81 3.92s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.5 4.86L6.34 12.45l1.41-1.41 2.99 2.99 6.36-6.36 1.41 1.41L10.75 16.86z"/>
                </svg>
              </div>`
        : ''
      }
      </div>
    `,
  });

const createAlertPulseIcon = () =>
  L.divIcon({
    className: '',
    iconSize: [200, 200],
    iconAnchor: [0, 20],
    html: `
      <div class="alert-pulse-wrapper">
        <div class="alert-pulse"></div>
        <div class="alert-pulse second"></div>
      </div>
    `
  });


// --- SVG ICONS --- //

const VerifiedBadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em', color: '#1d9bf0' }}>
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.33c-.46 1.4-.2 2.91.81 3.92s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.5 4.86L6.34 12.45l1.41-1.41 2.99 2.99 6.36-6.36 1.41 1.41L10.75 16.86z" />
  </svg>
);

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="#efeff0" style={{ width: '1.2em', height: '1.2em' }}>
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
  </svg>
);


// --- HELPER FUNCTIONS --- //

// Simple sentiment analysis based on dominant emoji
const getSentiment = (reactions: Record<string, number>): { sentiment: string; color: string } => {
  let positive = 0;
  let funny = 0;
  let negative = 0;

  for (const [emoji, count] of Object.entries(reactions)) {
    if (emoji === '👍') positive += count;
    else if (emoji === '😂') funny += count;
    else if (emoji === '👎') negative += count;
  }

  if (positive === 0 && funny === 0 && negative === 0) {
    return { sentiment: 'Neutral', color: '#888' };
  }

  const max = Math.max(positive, funny, negative);

  if (positive === max && positive !== 0) {
    return { sentiment: 'Positive', color: '#2ecc71' };
  } else if (funny === max && funny !== 0) {
    return { sentiment: 'Funny', color: '#f39c12' };
  } else if (negative === max && negative !== 0) {
    return { sentiment: 'Negative', color: '#e74c3c' };
  }

  return { sentiment: 'Neutral', color: '#888' };
};


// --- REACT COMPONENTS --- //

const App: React.FC = () => {
  const [users] = useState<User[]>(mockUsers);
  const [posts, setPosts] = useState<Post[]>(mockPosts);

  const addNewPost = (newPost: Omit<Post, 'id' | 'timestamp'>) => {
    const id = Date.now();

    const postWithMeta: Post = {
      ...newPost,
      id,
      timestamp: 'Just now',
      reactions: {
        '👍': 0,
        '😂': 0,
        '👎': 0,
      },
    };

    setPosts(prev => {
      const updated = [postWithMeta, ...prev];
      return updated;
    });

    simulateReactions(id);
  };

  const simulateReactions = (postId: number) => {
    const emojis = ['👍', '😂', '👎'];
    let count = 0;
    const interval = setInterval(() => {
      setPosts(prevPosts => {
        return prevPosts.map(post => {
          if (post.id !== postId) return post;

          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          const current = post.reactions?.[emoji] || 0;

          return {
            ...post,
            reactions: {
              ...post.reactions,
              [emoji]: current + 1,
            },
          };
        });
      });

      count++;
      if (count >= 15) clearInterval(interval);
    }, 1000);
  };

  const [currentUser] = useState<User>(mockUsers[0]);
  const [isModeratorDashboardOpen, setModeratorDashboardOpen] = useState(false);
  const [isAlertActive, setAlertActive] = useState(false);
  const toggleAlert = () => {
    setAlertActive(prev => !prev);
  };

  // Gesture handling state for moderator dashboard
  const touchStartY = useRef<number | null>(null);
  const modPanelRef = useRef<HTMLDivElement>(null);
  const [swipeHintVisible, setSwipeHintVisible] = useState(false);
  const [swipeStep, setSwipeStep] = useState<0 | 1>(0);


  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 5) return;
    touchStartY.current = e.touches[0].clientY;
  };


  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || window.scrollY > 5) return;

    const currentTouchY = e.touches[0].clientY;
    const diffY = currentTouchY - touchStartY.current;

    if (diffY > 40) {
      if (swipeStep === 0) {
        setSwipeHintVisible(true);
        setSwipeStep(1);
        touchStartY.current = null;
      } else if (swipeStep === 1) {
        setModeratorDashboardOpen(true);
        setSwipeHintVisible(false);
        setSwipeStep(0);
        touchStartY.current = null;
      }
    }

    if (diffY < -30 && swipeStep === 1) {
      setSwipeHintVisible(false);
      setSwipeStep(0);
      touchStartY.current = null;
    }

    if (diffY < -5 && isModeratorDashboardOpen) {
      setModeratorDashboardOpen(false);
      setSwipeHintVisible(false);
      setSwipeStep(0);
      touchStartY.current = null;
    }
  };

  const getUserById = useCallback((id: number) => users.find(u => u.id === id)!, [users]);

  return (
    <>
      {/* Global Styles */}
      <style>{`
        :root {
          --bg-color: #f0f2f5;
          --panel-color: #ffffff;
          --primary-text: #050505;
          --secondary-text: #65676b;
          --accent-color: #1877f2;
          --danger-color: #e60023;
          --verified-color: #1d9bf0;
        }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #101618;
          color: #101618;
          overscroll-behavior-y: contain; /* Prevents pull-to-refresh */
        }
        .app-container {
          max-width: 450px;
          margin: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #101618;
          position: relative;
        }
        .header {
          padding: 12px 16px;
          font-size: 1.5rem;
          font-weight: bold;
          background-color: #101618;
          color: #de5c50;
          z-index: 10;
          cursor: grab;
        }
        .main-content {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          color: #101618;
          background-color: #101618;
        }
        .map-view {
          height: 300px;
          background-color: #a2d2ff;
          position: relative;
          overflow: hidden;
          background-image: linear-gradient(45deg, #bde0fe 25%, transparent 25%), linear-gradient(-45deg, #bde0fe 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #bde0fe 75%), linear-gradient(-45deg, transparent 75%, #bde0fe 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
        .user-pin {
          position: absolute;
          transform: translate(-50%, -100%);
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .user-pin:hover {
          transform: translate(-50%, -100%) scale(1.1);
        }
        .user-pin img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .user-pin .verified-icon-map {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: white;
          border-radius: 50%;
          font-size: 18px;
          line-height: 1;
        }
        .profile-card {
          position: absolute;
          bottom: 20px;
          left: 10px;
          right: 10px;
          background: white;
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 5;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .profile-card img {
          width: 50px;
          height: 50px;
          border-radius: 50%;
        }
        .profile-card-info {
          flex-grow: 1;
        }
        .profile-card-name {
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .profile-card-bio {
          font-size: 0.9rem;
          color: var(--secondary-text);
        }
        .alert-button {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 50px;
          height: 50px;
          background-color: #de5c50;
          border-radius: 50%;
          border: none;
          color: white;
          font-weight: bold;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
          z-index: 999;
          transition: transform 0.1s ease;
        }
        .alert-button:active {
          transform: scale(0.6);
        }
        .alert-animation {
            position: absolute;
            border-radius: 50%;
            border: 3px solid var(--danger-color);
            background-color: #de5c50;
            animation: pulse 2s infinite ease-out;
            transform: translate(-50%, -50%);
            z-index: 999;
        }
        @keyframes pulse {
            0% { width: 0; height: 0; opacity: 1; }
            100% { width: 200px; height: 200px; opacity: 0; }
            z-index: 999;
        }
        .alert-pulse-wrapper {
          position: absolute;
          width: 100px;
          height: 100px;
          transform: translate(-50%, -50%);
          opacity: 0;
          animation: fadeIn 0.4s forwards;
        }

        .alert-pulse {
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background-color: #de5c50;
          border: 4px solid #e60023;
          animation: pulse 2s infinite ease-out;
          animation-delay: 0s;
          animation-fill-mode: forwards;
          opacity: 0;
        }

        .alert-pulse.second {
          animation-delay: 1s;
        }

        @keyframes pulse {
          0% {
            transform: scale(0.3);
            opacity: 0.9;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
        .community-wall {
          flex-grow: 1;
          overflow-y: auto;
          padding: 8px;
          background-color: #101618;
        }
        .post-card {
          background: #1a2228;
          color: #efeff0;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .post-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .post-header img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }
        .post-author-info .name {
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .post-author-info .timestamp {
          font-size: 0.8rem;
          color: var(--secondary-text);
        }
        .post-content {
          margin-bottom: 12px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .voice-player {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: #000;
          padding: 8px 12px;
          border-radius: 20px;
        }
        .voice-player progress {
          width: 100%;
        }
        .post-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #df5c50;
          padding-top: 8px;
        }
        .reactions {
          display: flex;
          gap: 8px;
        }
        .reactions span {
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 16px;
          background: #101618;
          transition: background 0.2s ease;
        }
        .reactions span:hover {
          background: #e4e6eb;
        }
        .sentiment-tag {
          font-size: 0.8rem;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 8px;
        }
        .mod-dashboard {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.8);
          color: #efeff0;
          z-index: 9999;
          padding: 20px;
          padding-top: 60px; /* Space for header */
          backdrop-filter: blur(5px);
          transform: translateY(-100%);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mod-dashboard.open {
          transform: translateY(0);
        }
        .mod-dashboard h2 {
          margin-top: 0;
          border-bottom: 1px solid #555;
          padding-bottom: 10px;
          font-weight: bold;
        }
        .mod-close-hint {
          text-align: center;
          color: #aaa;
          font-style: italic;
          margin-top: 20px;
        }

        .swipe-hint-bar {
          height: 40px;
          background: #df5d50;
          color: white;
          text-align: center;
          font-weight: bold;
          line-height: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.3s ease;
        }

        .swipe-hint-bar.hidden {
          opacity: 0;
          max-height: 0;
        }

      `}</style>

      <div className="app-container" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
        <ModeratorDashboard
          isOpen={isModeratorDashboardOpen}
          posts={posts}
          users={users}
          ref={modPanelRef}
        />


        <div className={swipeHintVisible ? "swipe-hint-bar" : "swipe-hint-bar hidden"}>
          Swipe down again to open moderator dashboard
        </div>

        <header className="header">
          Neighborly
        </header>

        <main className="main-content">
          <MapView
            users={users}
            currentUser={currentUser}
            isAlertActive={isAlertActive}
          />
          <AlertButton onAlert={toggleAlert} isActive={isAlertActive} />
          <PostComposer onPost={addNewPost} currentUser={currentUser} />

          <CommunityWall posts={posts} getUserById={getUserById} />
        </main>
      </div>
    </>
  );
};

// --- Child Components --- //

interface MapViewProps {
  users: User[];
  currentUser: User;
  isAlertActive: boolean;
}

const MapView: React.FC<MapViewProps> = ({ users, currentUser, isAlertActive }) => {

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={true}
      style={{ height: "300px", width: "95%", alignSelf: "center", borderRadius: "12px" }}
    >
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        url="https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
      />

      {users.map(user => (
        <Marker
          key={user.id}
          position={[user.location.top, user.location.left]}
          icon={createAvatarIcon(user.avatar, user.isVerified)}
          eventHandlers={{
            click: () => (user),
          }}
        >
          <Popup offset={[0, -40]}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={user.avatar} alt={user.name} style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div>
                <div style={{ fontWeight: 'bold' }}>{user.name} {user.isVerified && <VerifiedBadgeIcon />}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{user.bio}</div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {isAlertActive && (
        <Marker
          position={[currentUser.location.top, currentUser.location.left]}
          icon={createAlertPulseIcon()}
          interactive={false}
        />
      )}
    </MapContainer>
  );
};

const AlertButton = ({ onAlert, isActive }: { onAlert: () => void, isActive: boolean }) => (
  <button
    onClick={onAlert}
    className="alert-button"
    style={{ backgroundColor: isActive ? '#de5c50' : '#aaa' }}
  >
    {isActive ? 'Stop' : 'Alert'}
  </button>
);

interface CommunityWallProps {
  posts: Post[];
  getUserById: (id: number) => User;
}

const CommunityWall: React.FC<CommunityWallProps> = ({ posts, getUserById }) => (
  <div className="community-wall">
    {posts.map(post => (
      <PostCard key={post.id} post={post} author={getUserById(post.authorId)} />
    ))}
  </div>
);

interface PostCardProps {
  post: Post;
  author: User;
}

if (typeof MediaRecorder === 'undefined') {
  window.MediaRecorder = AudioRecorderPolyfill;
}

const PostComposer: React.FC<{ onPost: (post: Omit<Post, 'id' | 'timestamp'>) => void; currentUser: User }> = ({ onPost, currentUser }) => {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSubmitText = () => {
    if (content.trim() === '') return;
    onPost({
      authorId: currentUser.id,
      type: 'text',
      content: content.trim(),
      reactions: {},
      isReported: false,
    });
    setContent('');
  };

  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        onPost({
          authorId: currentUser.id,
          type: 'voice',
          content: url,
          reactions: {},
          isReported: false,
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mikrofon hatası:', err);
    }
  };

  return (
    <div className="p-4 bg-[#101618] border-t border-gray-800">
      <div className="flex gap-3">
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-10 h-10 rounded-full border-2 border-[#df5c50]"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share something with your neighbors..."
          rows={3}
          className="flex-1 resize-none p-2 border border-gray-700 rounded-lg bg-[#181f22] text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#df5c50]"
        />
      </div>
      <div className="flex justify-end mt-2 gap-2">
        <button
          onClick={handleRecord}
          className={`w-15 h-12 p-2 rounded-full shadow transition flex items-center justify-center text-white ${isRecording ? '!bg-[#ac2b20]' : '!bg-[#df5c50] !hover:bg-[#df5c50]'
            }`}
          aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          <MicIcon />
        </button>


        <button
          onClick={handleSubmitText}
          className="!bg-[#df5c50] hover:bg-red-600 text-[#efeff0] text-sm font-medium px-4 py-2 rounded-full shadow transition"
        >
          Post
        </button>
      </div>
    </div>
  );
};


const PostCard: React.FC<PostCardProps> = ({ post, author }) => {
  const [reactions, setReactions] = useState<Record<string, number>>({ ...post.reactions });
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReactions({ ...post.reactions });
  }, [post.reactions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };

    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfile]);

  const sentiment = getSentiment(reactions);

  const handleReaction = (emoji: string) => {
    setReactions(prev => {
      const updated = { ...prev };

      if (userReaction && updated[userReaction]) {
        updated[userReaction] -= 1;
        if (updated[userReaction] === 0) delete updated[userReaction];
      }

      if (userReaction === emoji) {
        setUserReaction(null);
        return updated;
      }

      updated[emoji] = (updated[emoji] || 0) + 1;
      setUserReaction(emoji);
      return updated;
    });
  };

  return (
    <div className="post-card relative">
      <div className="post-header flex items-center gap-2">
        <img
          src={author.avatar}
          alt={author.name}
          className="w-10 h-10 rounded-full cursor-pointer"
          onClick={() => setShowProfile(prev => !prev)}
        />
        <div
          className="post-author-info cursor-pointer"
          onClick={() => setShowProfile(prev => !prev)}
        >
          <div className="name font-semibold flex items-center gap-1">
            {author.name}
            {author.isVerified && <VerifiedBadgeIcon />}
          </div>
          <div className="timestamp text-sm text-gray-400">{post.timestamp}</div>
        </div>
      </div>

      {/* Profil kutusu */}
      {showProfile && (
        <div
          ref={profileRef}
          className="absolute top-14 left-0 z-10 bg-[#101618] text-white p-4 rounded-lg shadow-md w-94"
        >
          <div className="flex items-center gap-3 mb-2">
            <img src={author.avatar} className="w-12 h-12 rounded-full" />
            <div>
              <div className="font-bold text-sm">{author.name}</div>
              {author.isVerified && <div className="text-xs text-green-400"><VerifiedBadgeIcon /></div>}
            </div>
          </div>
          <div className="text-sm text-gray-300 whitespace-pre-line">{author.bio}</div>
          <button
            onClick={() => setShowProfile(false)}
            className="mt-2 text-xs text-[#efeff0] hover:text-white !bg-[#df5c50]"
          >
            Close
          </button>
        </div>
      )}

      <div className="post-content mt-3">
        {post.type === 'text' ? (
          <p>{post.content}</p>
        ) : (
          <VoiceMessagePlayer src={post.content} />
        )}
      </div>

      <div className="post-footer mt-4">
        <div className="reactions flex gap-3">
          {['👍', '😂', '👎'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-lg transition 
                ${userReaction === emoji
                  ? 'bg-white text-#efeff0 font-bold shadow'
                  : '!bg-[#101618] text-white !hover:bg-[#101618]'}`}
            >
              {emoji} {reactions[emoji] || 0}
            </button>
          ))}
        </div>
        <div
          className="sentiment-tag px-2 py-1 rounded text-xs mt-2"
          style={{ backgroundColor: sentiment.color, color: '#efeff0' }}
        >
          {sentiment.sentiment}
        </div>
      </div>
    </div>
  );
};

const formatTime = (duration: number | null): string => {
  if (!duration || isNaN(duration) || !isFinite(duration)) return '--:--';
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const VoiceMessagePlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);

    const setMeta = () => {
      if (isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      } else {
        audio.currentTime = 1e101;
        audio.ontimeupdate = () => {
          audio.ontimeupdate = null;
          audio.currentTime = 0;
          setAudioDuration(audio.duration);
        };
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", setMeta);
    audio.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", setMeta);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-3 bg-[#1e2328] rounded-xl px-4 py-2 shadow w-fit">
      <button
        onClick={togglePlay}
        className="w-13 h-13 !rounded-full !bg-[#2c343a] !text-[#efeff0] flex items-center justify-center shadow-md !hover:bg-[#3a444c] transition"
      >
        {isPlaying ? (
          <FaPause className="text-white text-lg" />
        ) : (
          <FaPlay className="text-white text-lg" />
        )}
      </button>

      <div className="flex gap-[2px] items-center h-10 w-36">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`w-[3px] transition-all duration-200 rounded ${isPlaying ? "bg-[#df5c50]" : "bg-gray-500"
              }`}
            style={{
              height: `${16 + Math.sin(i + currentTime) * 20}px`,
              transform: "translateY(0)",
            }}
          />
        ))}
      </div>

      <span className="text-sm text-white min-w-[40px] text-right">
        {formatTime(audioDuration)}
      </span>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
};


interface ModeratorDashboardProps {
  isOpen: boolean;
  posts: Post[];
  users: User[];
}

const ModeratorDashboard = React.forwardRef<HTMLDivElement, ModeratorDashboardProps>(
  ({ isOpen, posts, users }, ref) => {
    const reportedPosts = posts.filter((p) => p.isReported);
    const negativePosts = posts.filter((p) => getSentiment(p.reactions).sentiment === 'Negative');
    const pendingUsers = users.filter((u) => !u.isVerified);

    const [openSections, setOpenSections] = useState({
      reported: true,
      users: false,
      sentiments: false,
    });

    const toggleSection = (section: keyof typeof openSections) => {
      setOpenSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }));
    };

    return (
      <div
        ref={ref}
        className={`mod-dashboard ${isOpen ? 'open' : ''} p-4 bg-[#101618] text-white`}
      >
        <h2 className="text-lg font-semibold mb-4">Moderation Dashboard</h2>

        {/* Reported Content */}
        <section className="mb-6">
          <button
            onClick={() => toggleSection('reported')}
            className="w-full text-left font-bold text-md mb-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            📢 Reported Content ({reportedPosts.length})
          </button>
          {openSections.reported &&
            (reportedPosts.length === 0 ? (
              <p className="text-sm text-gray-400 px-4">No reported posts.</p>
            ) : (
              reportedPosts.map((post) => {
                const author = users.find((u) => u.id === post.authorId);
                return (
                  <div
                    key={post.id}
                    className="p-3 rounded bg-[#181f22] mb-2 flex items-start gap-2 ml-4"
                  >
                    <img src={author?.avatar} className="w-10 h-10 rounded-full" />
                    <div>
                      <div className="font-semibold">{author?.name}</div>
                      <div className="text-sm text-gray-300">{post.content}</div>
                    </div>
                  </div>
                );
              })
            ))}
        </section>

        {/* Users */}
        <section className="mb-6">
          <button
            onClick={() => toggleSection('users')}
            className="w-full text-left font-bold text-md mb-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            🧍‍♂️ Users Pending Verification ({pendingUsers.length})
          </button>
          {openSections.users &&
            (pendingUsers.length === 0 ? (
              <p className="text-sm text-gray-400 px-4">No pending users.</p>
            ) : (
              pendingUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2 mb-2 ml-4">
                  <img src={user.avatar} className="w-8 h-8 rounded-full" />
                  <span className="text-sm">{user.name}</span>
                </div>
              ))
            ))}
        </section>

        {/* Sentiments */}
        <section>
          <button
            onClick={() => toggleSection('sentiments')}
            className="w-full text-left font-bold text-md mb-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
          >
            🧠 Negative Posts ({negativePosts.length})
          </button>
          {openSections.sentiments &&
            (negativePosts.length === 0 ? (
              <p className="text-sm text-gray-400 px-4">No negative posts.</p>
            ) : (
              negativePosts.map((post) => {
                const author = users.find((u) => u.id === post.authorId);
                return (
                  <div
                    key={post.id}
                    className="text-sm mb-2 p-2 rounded bg-[#181f22] ml-4"
                  >
                    <div className="font-semibold">{author?.name}</div>
                    <div className="text-gray-300">{post.content}</div>
                  </div>
                );
              })
            ))}
        </section>

        <p className="mod-close-hint text-center mt-6 text-xs text-gray-400">
          Swipe up to close
        </p>
      </div>
    );
  }
);

export default App;