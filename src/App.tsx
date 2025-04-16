import React, { useState } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';
import './App.css';

interface UserState {
  displayName: string;
  roomName: string;
  password: string;
}

function App() {
  const [user, setUser] = useState<UserState | null>(null);

  const handleLogin = (displayName: string, roomName: string, password: string) => {
    setUser({ displayName, roomName, password });
  };

  const handleDisconnect = () => {
    setUser(null);
  };

  return (
    <div className="App">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Chat
          displayName={user.displayName}
          roomName={user.roomName}
          password={user.password}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}

export default App;
