import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchSubmissions } from './services/sheetService';
import type { Submission, SubmissionWithDiff } from './types';

const TrophyIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.7.2a.75.75 0 00-1.4 0L8.5 6.472l-5.91-.167a.75.75 0 00-.573 1.284l4.354 4.545-2.22 6.137a.75.75 0 001.09.848l5.42-3.14 5.42 3.14a.75.75 0 001.09-.848l-2.22-6.137 4.354-4.545a.75.75 0 00-.573-1.284l-5.91.167L12.7.2zM12 11.25a.75.75 0 01.75.75v8.25a.75.75 0 01-1.5 0V12a.75.75 0 01.75-.75zM4.5 20.25a.75.75 0 000 1.5h15a.75.75 0 000-1.5h-15z" />
  </svg>
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
          <svg className="animate-spin h-12 w-12 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-xl text-slate-600">Đang tải dữ liệu...</p>
        </div>
      );
    }

    if (error) {
      return <p className="text-2xl text-red-700 bg-red-100 p-4 rounded-lg">{error}</p>;
    }

    const winner = closestSubmissions.length > 0 ? closestSubmissions[0] : null;

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <input
              type="text"
              value={choiceFilter}
              onChange={(e) => setChoiceFilter(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Lọc theo lựa chọn"
              className="bg-slate-50 border border-slate-300 rounded-lg p-4 text-lg w-full md:w-1/2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 text-slate-900 placeholder-slate-400"
            />
            <input
              type="text"
              value={finalResult}
              onChange={(e) => setFinalResult(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập kết quả cuối cùng"
              className="flex-grow bg-slate-50 border border-slate-300 rounded-lg p-4 text-lg w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300 text-slate-900 placeholder-slate-400"
            />
            <button
              onClick={handleFindWinner}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-lg text-lg w-full md:w-auto transition-transform duration-300 transform hover:scale-105 whitespace-nowrap"
            >
              Tìm người thắng
            </button>
          </div>
          <p className="text-center text-sm text-slate-500 mt-3">
            Có <span className="font-bold text-indigo-600">{filteredSubmissions.length}</span> lượt tham gia hợp lệ
            {choiceFilter.trim() !== '' && (
                <span> cho lựa chọn chứa <span className="font-semibold text-indigo-600">"{choiceFilter}"</span></span>
            )}.
          </p>
        </div>
        
        {winner && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Winner Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 border-2 border-amber-400 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 text-amber-500/10">
                    <TrophyIcon className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <TrophyIcon className="w-10 h-10 text-amber-500" />
                        <h2 className="text-3xl font-bold text-amber-600 tracking-wider">NGƯỜI CHIẾN THẮNG</h2>
                    </div>
                    <div className="space-y-3 text-lg">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="font-semibold text-slate-500">Số điện thoại:</span>
                            <span className="font-mono text-slate-900">{winner.phone}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="font-semibold text-slate-500">Thời gian gửi:</span>
                            <span className="font-mono text-slate-900 text-sm">{formatTimestamp(winner.timestamp)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="font-semibold text-slate-500">Lựa chọn:</span>
                            <span className="text-slate-900 text-right">{winner.choice}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="font-semibold text-slate-500">Dự đoán:</span>
                            <span className="font-mono text-green-600 text-xl">{winner.prediction.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="font-semibold text-slate-500">Chênh lệch:</span>
                            <span className="font-mono text-red-600 text-xl font-bold">{winner.diff.toLocaleString('vi-VN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Runners-up List */}
            {closestSubmissions.length > 1 && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                    <h3 className="text-2xl font-bold text-indigo-600 mb-4">Top 5 dự đoán gần nhất</h3>
                    <ol className="space-y-3">
                        {closestSubmissions.map((sub, index) => (
                            <li key={sub.id} className={`p-4 rounded-lg flex items-center justify-between gap-4 transition-colors duration-300 ${index === 0 ? 'bg-amber-100/50 border border-amber-400/30' : 'bg-slate-50 border border-transparent'}`}>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xl font-bold ${index === 0 ? 'text-amber-600' : 'text-slate-500'}`}>#{index + 1}</span>
                                    <div>
                                        <p className="font-mono text-slate-800">{sub.phone}</p>
                                        <p className="text-xs text-slate-500 font-mono">{formatTimestamp(sub.timestamp)}</p>
                                        <p className="text-sm text-slate-600 hidden sm:block">{sub.choice}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-green-600">{sub.prediction.toLocaleString('vi-VN')}</p>
                                    <p className="text-sm text-red-600">Lệch: {sub.diff.toLocaleString('vi-VN')}</p>
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

  return (
    <main className="bg-slate-100 text-slate-800 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-600 mb-2">
          Tìm Kiếm Người Thắng Cuộc Với Kết Quả Dự Đoán Chính Xác Nhất
        </h1>
        <p className="text-lg text-slate-500">
          Dữ liệu được cập nhật trực tiếp từ Google Sheet
        </p>
      </div>
      {renderContent()}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </main>
  );
};

export default App;
