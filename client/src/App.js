import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Plus, X, ExternalLink, ChevronDown, ChevronUp, Terminal, Trash2 } from 'lucide-react';
import { useSocket } from './hooks/useSocket'; 
import './App.css';

// --- CONFIG ---
// Use the same environment variable strategy as useSocket.js
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// --- HELPERS ---
const transformData = (backendProduct) => {
    if (!backendProduct.listings || backendProduct.listings.length === 0) return [];
    
    const amazonListing = backendProduct.listings.find(l => l.store === 'AMAZON');
    const flipkartListing = backendProduct.listings.find(l => l.store === 'FLIPKART');
    
    const amazonHistory = amazonListing?.history || [];
    const flipkartHistory = flipkartListing?.history || [];

    if (amazonHistory.length > 0) {
        return amazonHistory.map((h, index) => ({
            time: new Date(h.scrapedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            amazon: h.price,
            flipkart: flipkartHistory[index]?.price || null 
        })).reverse(); 
    }

    if (flipkartHistory.length > 0) {
        return flipkartHistory.map((h) => ({
            time: new Date(h.scrapedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            amazon: null,
            flipkart: h.price
        })).reverse();
    }

    return [];
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState(null); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [showLogs, setShowLogs] = useState(true);
  
  // Import the socket hook
  const { logs, isConnected } = useSocket();

  // FETCH DATA
  const fetchProducts = async () => {
    try {
      // Use the dynamic API_BASE_URL
      const res = await axios.get(`${API_BASE_URL}/api/products`);

      const formattedProducts = res.data.map(p => {
        const amazonListing = p.listings.find(l => l.store === 'AMAZON');
        const flipkartListing = p.listings.find(l => l.store === 'FLIPKART');

        const amzHistoryItem = amazonListing?.history?.[0];
        const fkHistoryItem = flipkartListing?.history?.[0];

        const amzPrice = amzHistoryItem?.price || null;
        const fkPrice = fkHistoryItem?.price || null;

        let latestTime = null;
        if (amzHistoryItem && fkHistoryItem) {
             const t1 = new Date(amzHistoryItem.scrapedAt);
             const t2 = new Date(fkHistoryItem.scrapedAt);
             latestTime = t1 > t2 ? t1 : t2;
        } else if (amzHistoryItem) {
             latestTime = new Date(amzHistoryItem.scrapedAt);
        } else if (fkHistoryItem) {
             latestTime = new Date(fkHistoryItem.scrapedAt);
        }

        const latestEntry = {
            amazon: amzPrice,
            flipkart: fkPrice,
            time: latestTime ? latestTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : null
        };

        return {
          id: p.id,
          name: p.name,
          image: p.imageURL || "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg",
          amazonUrl: amazonListing?.url || "#",
          flipkartUrl: flipkartListing?.url || "#",
          latestEntry: latestEntry,
          history: transformData(p)
        };
      });

      setProducts(formattedProducts);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  // ✅ LOG LISTENER (Fixed for Array Order)
  useEffect(() => {
    // In useSocket, we do [newLog, ...prev], so the NEWEST log is at index 0
    const latestLog = logs[0]; 

    if (latestLog && latestLog.type === 'SUCCESS') {
        // Prevent refetching on the initial "Connected to Server" message
        // unless you specifically want to. 
        if (latestLog.msg === "Connected to Server") return;

        console.log("♻️ Price update detected! Refreshing graph...");
        fetchProducts();
    }
  }, [logs]);

  // ✅ INITIAL SYSTEM LOADER
  useEffect(() => {
    const initSystem = async () => {
        const minWait = new Promise(resolve => setTimeout(resolve, 1500));
        const dataFetch = fetchProducts();
        await Promise.all([minWait, dataFetch]);
        setLoading(false);
    };
    initSystem();
  }, []);

  // HANDLERS
  const handleOpenCreate = () => setView('create');
  const handleClose = () => { setView(null); setSelectedProduct(null); };
  
  const handleProductClick = (product) => { 
      setSelectedProduct(product); 
      setView('detail'); 
  };
  
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
        name: formData.get('name'),
        amazonUrl: formData.get('amazonUrl'),
        flipkartUrl: formData.get('flipkartUrl')
    };
    try {
        await axios.post(`${API_BASE_URL}/api/track`, payload);
        fetchProducts(); 
        handleClose();
    } catch (err) {
        alert("Error creating product: " + err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if(!window.confirm(`Are you sure you want to stop tracking "${name}"?`)) return;
    try {
        await axios.delete(`${API_BASE_URL}/api/products/${id}`);
        // Optimistic UI Update
        setProducts(prev => prev.filter(p => p.id !== id));
        if (selectedProduct?.id === id) handleClose();
    } catch (err) {
        alert("Failed to delete: " + err.message);
    }
  };

  // STATS
  const totalProducts = products.length;
  const totalValue = products.reduce((acc, p) => {
    const latest = p.latestEntry || { amazon: null, flipkart: null };
    const prices = [latest.amazon, latest.flipkart].filter(price => price && price > 0);
    const lowest = prices.length > 0 ? Math.min(...prices) : 0;
    return acc + lowest;
  }, 0);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div 
          key="loader" className="loading-screen"
          exit={{ opacity: 0, y: -20, transition: { duration: 0.5 } }}
        >
          <div className="loading-logo-container">
            <motion.h1 
              className="loading-logo"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              PriceMatrix<span className="loading-dot">.</span>
            </motion.h1>
            <div className="loading-sub">Real-time Comparison Engine</div>
            <div className="loading-bar-container">
              <div className="loading-bar"></div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="dashboard" className="app-container"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
        >
          <header className="header">
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <h1 className="title">PriceMatrix<span style={{color: '#0A84FF'}}>.</span></h1>
              <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)'}}></div>
            </div>
            <button className="btn-primary" onClick={handleOpenCreate} style={{padding: '8px 20px', fontSize: '0.85rem'}}>
              <Plus size={16} /> <span>Track New</span>
            </button>
          </header>

          <div className="stats-row">
            <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <span className="stat-label">Tracked Items</span>
              <span className="stat-value">{totalProducts}</span>
            </motion.div>
            <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <span className="stat-label">Total Portfolio</span>
              <span className="stat-value">₹{totalValue.toLocaleString()}</span>
            </motion.div>
            <motion.div className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <span className="stat-label">System Status</span>
              <span className="stat-value" style={{color: isConnected ? '#30D158' : '#FF453A', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{width:8, height:8, background: isConnected ? '#30D158' : '#FF453A', borderRadius:'50%', boxShadow: isConnected ? '0 0 8px #30D158' : 'none'}}></span>
                {isConnected ? 'Online' : 'Disconnected'}
              </span>
            </motion.div>
          </div>

          <div className="grid">
            {products.length === 0 && <div style={{textAlign:'center', padding: 40, color:'#666'}}>No products tracked yet. Click "Track New".</div>}
            
            {products.map((product) => {
              const latest = product.latestEntry || { amazon: null, flipkart: null };
              const isAmazonCheaper = (latest.amazon || Infinity) <= (latest.flipkart || Infinity);
              const lowestPrice = Math.min(latest.amazon || 9999999, latest.flipkart || 9999999);
              const displayPrice = lowestPrice === 9999999 ? "N/A" : `₹${lowestPrice.toLocaleString()}`;

              return (
                <motion.div 
                  key={product.id} layoutId={`card-${product.id}`}
                  className="glass-card" onClick={() => handleProductClick(product)}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="card-header">
                    <img 
                        src={product.image} 
                        alt={product.name} 
                        className="thumb" 
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/80?text=No+Img"; }}
                    />
                    <div className="card-info">
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                        <h3>{product.name}</h3>
                        <button 
                            className="btn-delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(product.id, product.name);
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="badges">
                        <span className={`badge amazon ${isAmazonCheaper ? 'cheapest' : ''}`}>Amazon</span>
                        <span className={`badge flipkart ${!isAmazonCheaper ? 'cheapest' : ''}`}>Flipkart</span>
                      </div>
                    </div>
                  </div>
                  <div className="price-row">
                    <span className="price-label">Current Lowest</span>
                    <span className="price-val">{displayPrice}</span>
                    <span style={{fontSize: '0.65rem', color: '#666', marginTop: '4px'}}>
                      {latest.time ? `Updated ${latest.time}` : 'Pending...'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="logs-container">
            <div className="logs-header" onClick={() => setShowLogs(!showLogs)}>
              <div className="logs-title">
                <Terminal size={14} /> <span>System Activity Log</span> <div className="live-dot"></div>
              </div>
              {showLogs ? <ChevronDown size={16} color="#666"/> : <ChevronUp size={16} color="#666"/>}
            </div>
            <AnimatePresence>
              {showLogs && (
                <motion.div 
                  className="logs-body"
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 180, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                >
                  {logs.length === 0 && <div style={{opacity:0.5}}>Connecting to satellite...</div>}
                  {logs.map((log, i) => (
                    <div key={i} className={`log-entry ${log.type === 'SUCCESS' ? 'success' : log.type === 'ERROR' ? 'error' : ''}`}>
                      <span className="log-time">[{log.time}]</span>
                      <span className="log-level">{log.type}</span>
                      <span className="log-message">{log.msg}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <footer className="footer">
            <div>
              <span>PriceMatrix v1.0.4</span>
              <span style={{margin: '0 10px', opacity: 0.3}}>|</span>
              <span>System Normal</span>
            </div>
            <div style={{display: 'flex', gap: '20px'}}>
              <a href="#" className="footer-link">Documentation</a>
              <a href="#" className="footer-link">API Status</a>
              <a href="#" className="footer-link">Logout</a>
            </div>
          </footer>

          <AnimatePresence>
            {view === 'create' && (
              <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="modal-content" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom: 20}}>
                    <h2 style={{margin:0}}>Track Product</h2>
                    <button className="btn-icon" onClick={handleClose}><X size={20}/></button>
                  </div>
                  <form onSubmit={handleCreateSubmit}>
                    <div className="form-group"><label>Product Name</label><input name="name" className="form-input" placeholder="e.g. Samsung S24 Ultra" required /></div>
                    <div className="form-group"><label>Amazon URL</label><input name="amazonUrl" className="form-input" placeholder="https://amazon.in/..." required /></div>
                    <div className="form-group"><label>Flipkart URL</label><input name="flipkartUrl" className="form-input" placeholder="https://flipkart.com/..." required /></div>
                    <button type="submit" className="btn-primary" style={{width: '100%', justifyContent:'center'}}>Start Tracking</button>
                  </form>
                </motion.div>
              </motion.div>
            )}

            {view === 'detail' && selectedProduct && (
              <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}>
                <motion.div className="modal-content detail-mode" layoutId={`card-${selectedProduct.id}`} onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 30}}>
                    <div style={{display:'flex', gap: 20}}>
                      <img 
                        src={selectedProduct.image} 
                        alt={selectedProduct.name} 
                        className="thumb" 
                        style={{width: 80, height: 80}} 
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/80?text=No+Img"; }}
                      />
                      <div>
                        <h2 style={{margin: '0 0 10px 0', fontSize: '1.5rem'}}>{selectedProduct.name}</h2>
                        <div style={{display:'flex', gap: 10}}>
                          <a href={selectedProduct.amazonUrl} target="_blank" rel="noreferrer" className="badge amazon" style={{textDecoration:'none', display:'flex', alignItems:'center', gap:4}}>Amazon <ExternalLink size={10}/></a>
                          <a href={selectedProduct.flipkartUrl} target="_blank" rel="noreferrer" className="badge flipkart" style={{textDecoration:'none', display:'flex', alignItems:'center', gap:4}}>Flipkart <ExternalLink size={10}/></a>
                        </div>
                      </div>
                    </div>
                    <button className="btn-icon" onClick={handleClose}><X size={20}/></button>
                  </div>
                  <div style={{height: 400, width: '100%'}}>
                    <ResponsiveContainer>
                      <LineChart data={selectedProduct.history} margin={{top: 10, right: 10, left: 10, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="time" stroke="#666" tick={{fill:'#666', fontSize:12}} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" tick={{fill:'#666', fontSize:12}} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="plainline" wrapperStyle={{paddingTop: 20}}/>
                        <Line type="monotone" dataKey="amazon" name="Amazon" stroke="#30D158" strokeWidth={3} dot={{r: 4, fill: '#30D158', strokeWidth: 0}} activeDot={{r: 6, stroke: 'white', strokeWidth: 2}} />
                        <Line type="monotone" dataKey="flipkart" name="Flipkart" stroke="#0A84FF" strokeWidth={3} dot={{r: 4, fill: '#0A84FF', strokeWidth: 0}} activeDot={{r: 6, stroke: 'white', strokeWidth: 2}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="graph-tooltip">
        <p style={{margin:'0 0 8px 0', fontSize:'0.8rem', color:'#8E8E93'}}>{label}</p>
        {payload.map((entry, index) => (
          <div key={index} style={{color: entry.stroke, fontSize:'0.9rem', fontWeight:600, marginBottom: 4}}>
            {entry.name}: ₹{entry.value ? entry.value.toLocaleString() : 'N/A'}
          </div>
        ))}
      </div>
    );
  }
  return null;
};