import React, { useState } from 'react';
import '../styles/Login.css';

interface LoginProps {
  onLogin: (displayName: string, roomName: string, password: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [displayName, setDisplayName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName && roomName && password) {
      onLogin(displayName, roomName, password);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Join Chat Room</h2>
        <div className="form-group">
          <label htmlFor="displayName">Display Name</label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="roomName">Room Name</label>
          <input
            type="text"
            id="roomName"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Join Chat</button>
      </form>
    </div>
  );
};

export default Login; 