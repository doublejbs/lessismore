import { useState, useRef, useEffect } from 'react';
import app from '../../App';

const UserMenu = () => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleLogout = async () => {
    await app.getFirebase().logout();
    window.location.reload();
    setOpen(false);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-label='사용자 메뉴'
      >
        {/* 사용자 아이콘 SVG */}
        <svg
          width='32'
          height='32'
          viewBox='0 0 32 32'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle cx='16' cy='16' r='16' fill='#E0E0E0' />
          <circle cx='16' cy='13' r='6' fill='#BDBDBD' />
          <ellipse cx='16' cy='25' rx='9' ry='5' fill='#BDBDBD' />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: '8px',
            background: 'white',

            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            minWidth: '120px',
            zIndex: 100,
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
