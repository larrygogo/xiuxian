import { useAuth } from './hooks/useAuth';
import { useGameState } from './hooks/useGameState';
import { Login } from './components/Login';
import { CharacterCreation } from './components/CharacterCreation';
import { MainStatus } from './components/MainStatus';
import { GameStatus } from './components/GameStatus';
import { GameActions } from './components/GameActions';
import { EventLog } from './components/EventLog';
import './App.css';

function App() {
  const { user, loading: authLoading, login, register, logout } = useAuth();
  const { state, loading: gameLoading, error, heal, tick, toggleTuna, createCharacter, renameCharacter, refresh } = useGameState(user?.id);

  if (authLoading) {
    return (
      <div className="app-loading">
        <div>加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container">
        <Login onLogin={login} onRegister={register} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>问道长生</h1>
        <div className="user-info">
          <span>欢迎，{user.username}</span>
          <button onClick={logout} className="logout-button">
            退出
          </button>
        </div>
      </div>
      <div className="app-content">
        {gameLoading ? (
          <div className="loading-message">加载游戏状态...</div>
        ) : error ? (
          <div className="error-message">
            <p>错误：{error}</p>
            <button onClick={() => window.location.reload()}>刷新页面</button>
          </div>
        ) : !state ? (
          <div className="loading-message">游戏状态为空，请刷新页面</div>
        ) : state.name === '无名修士' ? (
          <CharacterCreation onCreateCharacter={async (name) => {
            const result = await createCharacter(name);
            if (result.success) {
              await refresh();
            }
            return result;
          }} />
        ) : (
          <>
            <MainStatus state={state} />
            <GameStatus 
              state={state} 
              onHeal={heal}
              onRename={async (name) => {
                const result = await renameCharacter(name);
                if (result.success) {
                  await refresh();
                }
                return result;
              }}
            />
            <GameActions state={state} onTick={tick} onToggleTuna={toggleTuna} />
            <EventLog state={state} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
