// @ts-nocheck
import { useState, useEffect, useRef } from 'react';

// Daftar URL Gambar Mahjong
const MAHJONG_SYMBOLS = [
  'https://cdn-icons-png.flaticon.com/512/6911/6911931.png', 
  'https://cdn-icons-png.flaticon.com/512/6911/6911956.png', 
  'https://cdn-icons-png.flaticon.com/512/6911/6911959.png', 
  'https://cdn-icons-png.flaticon.com/512/6911/6911960.png', 
  'https://cdn-icons-png.flaticon.com/512/6911/6911964.png', 
  'https://cdn-icons-png.flaticon.com/512/2361/2361722.png', 
];

export default function Slot() {
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(1000);
  
  // State Grid 5x3
  const [grid, setGrid] = useState<string[][]>([
    [MAHJONG_SYMBOLS[0], MAHJONG_SYMBOLS[1], MAHJONG_SYMBOLS[2], MAHJONG_SYMBOLS[3], MAHJONG_SYMBOLS[4]],
    [MAHJONG_SYMBOLS[1], MAHJONG_SYMBOLS[2], MAHJONG_SYMBOLS[3], MAHJONG_SYMBOLS[4], MAHJONG_SYMBOLS[5]],
    [MAHJONG_SYMBOLS[2], MAHJONG_SYMBOLS[3], MAHJONG_SYMBOLS[4], MAHJONG_SYMBOLS[5], MAHJONG_SYMBOLS[0]]
  ]);
  
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State Auto Spin
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const autoSpinCountRef = useRef(0); 
  
  const token = localStorage.getItem('digitalku_user_token') || "";

  const fetchBalance = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/users/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setBalance(data.balance);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const handleSpin = async (isAuto = false) => {
    if (spinning) return;
    setError(null);
    setResult(null);
    setSpinning(true);

    // Suara Spin
    const spinSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    spinSound.volume = 0.5;
    spinSound.play().catch(e => console.log('Audio diblokir browser'));

    // Animasi ganti gambar acak (Flicker)
    const spinInterval = setInterval(() => {
      setGrid([
        Array.from({ length: 5 }, () => MAHJONG_SYMBOLS[Math.floor(Math.random() * 6)]),
        Array.from({ length: 5 }, () => MAHJONG_SYMBOLS[Math.floor(Math.random() * 6)]),
        Array.from({ length: 5 }, () => MAHJONG_SYMBOLS[Math.floor(Math.random() * 6)]),
      ]);
    }, 80);

    try {
      const res = await fetch('http://localhost:3000/api/slot/spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bet: Number(bet) })
      });
      
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Gagal spin');
        clearInterval(spinInterval);
        setSpinning(false);
        return;
      }

      clearInterval(spinInterval);
      
      setTimeout(() => {
        setGrid(data.spin.grid); 
        setBalance(data.spin.balance_after);
        setResult(data.spin);
        setSpinning(false);

        // Suara Menang
        if (data.spin.win > 0) {
          const winSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
          winSound.volume = 0.6;
          winSound.play().catch(e => console.log('Audio error', e));
        }

        // Logika Auto Spin
        if (isAuto || autoSpinCountRef.current > 0) {
          if (autoSpinCountRef.current > 1) {
            autoSpinCountRef.current -= 1; 
            setAutoSpinCount(autoSpinCountRef.current); 
            setTimeout(() => handleSpin(true), 500); 
          } else {
            autoSpinCountRef.current = 0;
            setAutoSpinCount(0);
            setIsAutoSpinning(false);
          }
        }

      }, 600);

    } catch (err) {
      clearInterval(spinInterval);
      setError('Terjadi kesalahan jaringan.');
      setSpinning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-100 blur-3xl"></div>

        <div className="relative z-10">
          <a href="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-4 text-sm font-medium transition-colors">
            <span className="mr-1">⬅️</span> Kembali ke Toko
          </a>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 mb-1">
               LUCKY SPIN
            </h1>
            <p className="text-amber-600 text-xs mb-4 font-bold animate-pulse">🔥 Uji keberuntunganmu sekarang! 🔥</p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl py-3 px-6 inline-block shadow-inner">
              <span className="text-slate-500 text-sm block mb-1">Saldo Anda</span>
              <span className="text-2xl font-bold text-red-600">
                Rp {balance.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* AREA REEL SLOT 5x3 (Animasi Flicker) */}
          <div className="flex flex-col gap-2 mb-8 bg-slate-100 p-4 rounded-2xl border border-slate-200 shadow-inner">
            {grid.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-2">
                {row.map((sym, colIndex) => (
                  <div 
                    key={colIndex} 
                    className={`w-14 h-16 flex items-center justify-center bg-white rounded-lg border-2 transition-all duration-75 shadow-sm
                      ${spinning ? 'border-red-400 opacity-80' : (result?.win > 0 ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-slate-200')}
                    `}
                  >
                    <img src={sym} alt="Mahjong" className="w-10 h-10 object-contain drop-shadow-md" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* KONTROL TARUHAN & SPIN */}
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rp</span>
                <input 
                  type="number" 
                  value={bet} 
                  onChange={(e) => setBet(Number(e.target.value))}
                  min="100" step="100" max="100000"
                  disabled={spinning}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-12 pr-4 text-slate-800 font-bold focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all disabled:opacity-50"
                />
              </div>
              <button 
                onClick={() => setBet(Math.max(100, Math.floor(bet / 2)))}
                disabled={spinning || bet <= 100}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors disabled:opacity-50"
              >
                ½
              </button>
              <button 
                onClick={() => setBet(Math.min(100000, bet * 2))}
                disabled={spinning || bet >= 100000}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors disabled:opacity-50"
              >
                2x
              </button>
              <button 
                onClick={() => setBet(Math.min(balance, 100000))}
                disabled={spinning || balance < 100}
                className="px-3 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm hover:bg-amber-200 transition-colors disabled:opacity-50"
              >
                MAX
              </button>
            </div>

            {/* Tombol Auto Spin */}
            <div className="flex justify-center mb-3 gap-2">
              {[10, 25, 50].map(count => (
                <button
                  key={count}
                  disabled={spinning || balance < bet}
                  onClick={() => {
                    autoSpinCountRef.current = count;
                    setAutoSpinCount(count);
                    setIsAutoSpinning(true);
                    handleSpin(true);
                  }}
                  className="px-3 py-1 bg-slate-100 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  AUTO {count}x
                </button>
              ))}
              
              {isAutoSpinning && (
                <button
                  onClick={() => {
                    autoSpinCountRef.current = 0;
                    setAutoSpinCount(0);
                    setIsAutoSpinning(false);
                  }}
                  className="px-3 py-1 bg-red-100 border border-red-300 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 animate-pulse"
                >
                  STOP AUTO
                </button>
              )}
            </div>

            {/* Tombol SPIN */}
            <button 
              onClick={() => handleSpin(false)} 
              disabled={spinning || bet < 100 || bet > 100000}
              className={`w-full py-4 rounded-xl font-extrabold text-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                ${spinning 
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white cursor-pointer'}
              `}
            >
              {spinning ? 'Memutar...' : 'SPIN'}
              {!spinning && <span></span>}
            </button>
          </div>

          {/* HASIL / PESAN ERROR */}
          <div className="h-12 flex items-center justify-center">
            {error && <span className="text-red-500 font-medium bg-red-50 px-4 py-1 rounded-full text-sm">❌ {error}</span>}
            {!error && result && (
              result.win > 0 ? (
                <span className="text-green-600 font-bold text-lg animate-bounce">
                  🎉 MENANG Rp {result.win.toLocaleString('id-ID')}!
                </span>
              ) : (
                <span className="text-slate-400 text-sm">😢 Belum beruntung, coba lagi!</span>
              )
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}