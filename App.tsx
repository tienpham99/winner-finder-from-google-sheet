import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchSubmissions } from './services/sheetService';
import type { Submission, SubmissionWithDiff } from './types';

// FIX: Added style prop to TrophyIcon to allow for inline styling and resolve TypeScript error.
const TrophyIcon: React.FC<{className?: string, style?: React.CSSProperties}> = ({ className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.7.2a.75.75 0 00-1.4 0L8.5 6.472l-5.91-.167a.75.75 0 00-.573 1.284l4.354 4.545-2.22 6.137a.75.75 0 001.09.848l5.42-3.14 5.42 3.14a.75.75 0 001.09-.848l-2.22-6.137 4.354-4.545a.75.75 0 00-.573-1.284l-5.91.167L12.7.2zM12 11.25a.75.75 0 01.75.75v8.25a.75.75 0 01-1.5 0V12a.75.75 0 01.75-.75zM4.5 20.25a.75.75 0 000 1.5h15a.75.75 0 000-1.5h-15z" />
  </svg>
);

const LanternIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M16 6.5c0-1.93-1.57-3.5-3.5-3.5S9 4.57 9 6.5v1c0 .83.67 1.5 1.5 1.5h4c.83 0 1.5-.67 1.5-1.5v-1zM12 2c-3.03 0-5.5 2.47-5.5 5.5v1c0 1.93 1.57 3.5 3.5 3.5h3c1.93 0 3.5-1.57 3.5-3.5v-1C17.5 4.47 15.03 2 12 2zM6.5 13c-1.1 0-2 .9-2 2s.9 2 2 2h11c1.1 0 2-.9 2-2s-.9-2-2-2h-11zm0 5c-1.1 0-2 .9-2 2s.9 2 2 2h11c1.1 0 2-.9 2-2s-.9-2-2-2h-11z" />
    </svg>
);

const MoonAndCloudsBackground = () => (
    <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-96 h-96 bg-amber-200 rounded-full blur-2xl opacity-60 animate-pulse-slow"></div>
            <div className="w-80 h-80 bg-amber-100 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        </div>
         <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-sky-900/50 rounded-full blur-3xl opacity-50"></div>
         <div className="absolute -top-20 -right-20 w-96 h-96 bg-red-900/30 rounded-full blur-3xl opacity-50"></div>
    </div>
);


const App: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [finalResult, setFinalResult] = useState<string>('');
  const [closestSubmissions, setClosestSubmissions] = useState<SubmissionWithDiff[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [choiceFilter, setChoiceFilter] = useState<string>('');

  const formatTimestamp = (timestamp: string): string => {
    try {
      const [datePart, timePart] = timestamp.split(' ');
      if (!datePart || !timePart) return timestamp;
  
      const [day, month, year] = datePart.split('/');
      const [hours, minutes, seconds] = timePart.split(':');
      
      const date = new Date();
      date.setFullYear(Number(year), Number(month) - 1, Number(day));
      date.setHours(Number(hours), Number(minutes), Number(seconds), 0);
      
      if (isNaN(date.getTime())) return timestamp;
  
      const pad = (num: number) => String(num).padStart(2, '0');
  
      const hh = pad(date.getHours());
      const mm = pad(date.getMinutes());
      const ss = pad(date.getSeconds());
      const DD = pad(date.getDate());
      const MM = pad(date.getMonth() + 1);
      const YYYY = date.getFullYear();
  
      return `${hh}:${mm}:${ss} ${DD}/${MM}/${YYYY}`;
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return timestamp;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchSubmissions();
        setSubmissions(data);
        setError(null);
      } catch (err) {
        setError('Không thể tải dữ liệu từ Google Sheet. Vui lòng thử lại sau.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);
  
  const filteredSubmissions = useMemo(() => {
    if (!choiceFilter.trim()) {
        return submissions;
    }
    const lowercasedFilter = choiceFilter.trim().toLowerCase();
    return submissions.filter(sub => 
        sub.choice.toLowerCase().includes(lowercasedFilter)
    );
  }, [submissions, choiceFilter]);


  const handleFindWinner = useCallback(() => {
    const resultNum = parseInt(finalResult.replace(/[.,]/g, ''), 10);
    
    if (isNaN(resultNum) || filteredSubmissions.length === 0) {
      setClosestSubmissions([]);
      return;
    }

    const submissionsWithDiff = filteredSubmissions.map(sub => ({
      ...sub,
      diff: Math.abs(sub.prediction - resultNum)
    }));

    submissionsWithDiff.sort((a, b) => {
      if (a.diff !== b.diff) {
        return a.diff - b.diff;
      }
      try {
        const [dayA, monthA, yearA, timeA] = a.timestamp.split(/[\/\s:]/);
        const dateA = new Date(`${yearA}-${monthA}-${dayA}T${timeA}:${a.timestamp.split(':')[1]}:${a.timestamp.split(':')[2]}`).getTime();

        const [dayB, monthB, yearB, timeB] = b.timestamp.split(/[\/\s:]/);
        const dateB = new Date(`${yearB}-${monthB}-${dayB}T${timeB}:${b.timestamp.split(':')[1]}:${b.timestamp.split(':')[2]}`).getTime();

        if (!isNaN(dateA) && !isNaN(dateB)) {
          return dateA - dateB;
        }
      } catch (e) {
        return a.timestamp.localeCompare(b.timestamp);
      }
      return a.timestamp.localeCompare(b.timestamp);
    });

    setClosestSubmissions(submissionsWithDiff.slice(0, 5));
  }, [finalResult, filteredSubmissions]);
  
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleFindWinner();
    }
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <svg className="animate-spin h-12 w-12 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-xl text-slate-300">Đang tải dữ liệu...</p>
        </div>
      );
    }

    if (error) {
      return <p className="text-2xl text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</p>;
    }

    const winner = closestSubmissions.length > 0 ? closestSubmissions[0] : null;

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
        <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 relative">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:flex-[3_1_0%] group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 group-focus-within:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V19l-4 2v-5.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <input
                type="text"
                value={choiceFilter}
                onChange={(e) => setChoiceFilter(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Lọc theo lựa chọn"
                aria-label="Lọc theo lựa chọn"
                className="bg-slate-900/70 border border-slate-700 rounded-lg p-4 pl-12 text-lg w-full focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all duration-300 text-slate-100 placeholder-slate-400"
              />
            </div>
            <div className="relative w-full md:flex-[2_1_0%] group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 group-focus-within:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M5 9h14M5 15h14" />
                  </svg>
              </div>
              <input
                type="text"
                value={finalResult}
                onChange={(e) => setFinalResult(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập kết quả dự đoán"
                aria-label="Nhập kết quả dự đoán"
                className="bg-slate-900/70 border border-slate-700 rounded-lg p-4 pl-12 text-lg w-full focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all duration-300 text-slate-100 placeholder-slate-400"
              />
            </div>
            <button
              onClick={handleFindWinner}
              className="bg-red-700 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-lg text-lg w-full md:w-auto transition-transform duration-300 transform hover:scale-105 whitespace-nowrap shadow-lg shadow-red-900/50"
            >
              Tìm người thắng
            </button>
          </div>
          <p className="text-center text-sm text-slate-400 mt-3">
            Có <span className="font-bold text-amber-400">{filteredSubmissions.length}</span> lượt tham gia hợp lệ
            {choiceFilter.trim() !== '' && (
                <span> cho lựa chọn chứa <span className="font-semibold text-amber-400">"{choiceFilter}"</span></span>
            )}.
          </p>
        </div>
        
        {winner && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Winner Card */}
            <div className="bg-gradient-to-br from-red-800 to-red-900 rounded-2xl shadow-2xl p-6 border-2 border-amber-400/50 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 text-amber-400/10">
                    <TrophyIcon className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <TrophyIcon className="w-10 h-10 text-amber-400 animate-glow" style={{ filter: 'drop-shadow(0 0 10px #fcd34d)' }}/>
                        <h2 className="text-3xl font-bold text-amber-300 tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>NGƯỜI CHIẾN THẮNG</h2>
                    </div>
                    <div className="space-y-3 text-lg">
                        <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                            <span className="font-semibold text-slate-300">Số điện thoại:</span>
                            <span className="font-mono text-white">{winner.phone}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                            <span className="font-semibold text-slate-300">Thời gian gửi:</span>
                            <span className="font-mono text-white text-sm">{formatTimestamp(winner.timestamp)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                            <span className="font-semibold text-slate-300">Lựa chọn:</span>
                            <span className="text-white text-right">{winner.choice}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                            <span className="font-semibold text-slate-300">Dự đoán:</span>
                            <span className="font-mono text-green-400 text-xl">{winner.prediction.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="font-semibold text-slate-300">Chênh lệch:</span>
                            <span className="font-mono text-red-400 text-xl font-bold">{winner.diff.toLocaleString('vi-VN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Runners-up List */}
            {closestSubmissions.length > 1 && (
                <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-700 relative">
                    <h3 className="text-2xl font-bold text-amber-400 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Top 5 dự đoán gần nhất</h3>
                    <ol className="space-y-3">
                        {closestSubmissions.map((sub, index) => (
                            <li key={sub.id} className={`p-4 rounded-lg flex items-center justify-between gap-4 transition-colors duration-300 ${index === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-900/50 border border-transparent'}`}>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xl font-bold ${index === 0 ? 'text-amber-400' : 'text-slate-400'}`}>#{index + 1}</span>
                                    <div>
                                        <p className="font-mono text-slate-200">{sub.phone}</p>
                                        <p className="text-xs text-slate-400 font-mono">{formatTimestamp(sub.timestamp)}</p>
                                        <p className="text-sm text-slate-300 hidden sm:block">{sub.choice}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-green-400">{sub.prediction.toLocaleString('vi-VN')}</p>
                                    <p className="text-sm text-red-400">Lệch: {sub.diff.toLocaleString('vi-VN')}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const hasResults = closestSubmissions.length > 0;

  return (
    <>
    <MoonAndCloudsBackground />
    <main className={`text-slate-200 min-h-screen flex flex-col items-center p-4 sm:p-8 relative z-10 ${hasResults ? 'justify-start' : 'justify-center'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div className="w-full text-center mb-8">
        <div className="flex justify-center items-center gap-4">
            <LanternIcon className="w-10 h-10 text-red-400/80 transform -scale-x-100" />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 py-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Đêm Hội Trăng Rằm - Tìm Kiếm Tài Năng
            </h1>
            <LanternIcon className="w-10 h-10 text-red-400/80" />
        </div>
        <p className="text-lg text-slate-300 mt-2">
          Dữ liệu được cập nhật trực tiếp từ Google Sheet
        </p>
      </div>
      {renderContent()}
      <style>{`
        body {
            overflow: hidden; /* Prevent scrollbars from background elements */
        }
        main {
            overflow-y: auto;
            max-height: 100vh;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.7;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
        @keyframes glow {
          0%, 100% {
            filter: drop-shadow(0 0 10px #fcd34d);
          }
          50% {
            filter: drop-shadow(0 0 15px #fef08a);
          }
        }
        .animate-glow {
            animation: glow 3s infinite ease-in-out;
        }
      `}</style>
    </main>
    </>
  );
};

export default App;
