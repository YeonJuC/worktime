import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../firebase";

export default function AuthGate(props: { children: (uid: string) => JSX.Element }) {
  const [uid, setUid] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  async function login() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch {
      // iOS 사파리/웹뷰에서 popup 막히면 redirect로 fallback
      await signInWithRedirect(auth, provider);
    }
  }

  async function logout() {
    await signOut(auth);
  }

  if (checking) {
    return (
      <div className="centerWrap">
        <div className="card glass">
          <div className="title">근무시간 캘린더</div>
          <div className="muted">불러오는 중…</div>
        </div>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="centerWrap">
        <div className="card glass">
          <div className="title">근무시간 캘린더</div>
          <p className="muted" style={{ marginTop: 10 }}>
            구글 로그인 후, 내 시간표만 저장 및 조회됩니다.
          </p>
          <button className="btn primary" onClick={login}>
            Google로 로그인
          </button>
          <p className="tiny muted" style={{ marginTop: 10 }}>
            * 로그인 안 하면 저장이 안 됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brand">근무시간</div>
        <button className="btn ghost" onClick={logout} title="로그아웃">
          로그아웃
        </button>
      </header>
      {props.children(uid)}
    </div>
  );
}
