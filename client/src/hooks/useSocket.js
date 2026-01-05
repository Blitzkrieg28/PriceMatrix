import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const SERVER_URL = "http://localhost:3000"; 

export const useSocket = () => {
    const [logs, setLogs] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socket = io(SERVER_URL);

        socket.on('connect', () => {
            setIsConnected(true);
            const connectLog = { 
                id: 'sys-connect-' + Date.now(), 
                time: new Date().toLocaleTimeString(), 
                type: "SUCCESS", 
                msg: "Connected to Server" 
            };
            setLogs(prev => [connectLog, ...prev]);
        });

        socket.on('disconnect', () => setIsConnected(false));

        socket.on('log_history', (history) => {
            if (Array.isArray(history) && history.length > 0) {
                setLogs(prevLogs => {
                    
                    const newIds = new Set(prevLogs.map(l => l.id));
                    const uniqueHistory = history.filter(h => !newIds.has(h.id));
                    return [...prevLogs, ...uniqueHistory];
                });
            }
        });

        socket.on('log', (newLog) => {
            setLogs(prev => [newLog, ...prev].slice(0, 50));
        });

        return () => socket.disconnect();
    }, []);

    return { logs, isConnected };
};