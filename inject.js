(function() {
    'use strict';
    
    if (window.__GHOST_MODE_ACTIVE) {
        console.log('Ghost Mode: Already running');
        return;
    }
    window.__GHOST_MODE_ACTIVE = true;
    
    console.log("GHOST MODE: Complete Read Receipt Annihilator v5.0");
    
    // STRATEGY 1:
    preventReadDetection();
    
    // STRATEGY 2: 
    blockAllReadReceiptCommunication();
    
    // STRATEGY 3: 
    hijackWhatsAppInternals();
    
    // STRATEGY 4:
    overrideVisibilityAPI();
    
    function preventReadDetection() {
        console.log("Preventing read detection...");
        
        // Override Intersection Observer (used to detect when messages are visible)
        if (window.IntersectionObserver) {
            const OriginalIntersectionObserver = window.IntersectionObserver;
            window.IntersectionObserver = function(callback, options) {
                const modifiedCallback = function(entries, observer) {
                    // Filter out entries that would trigger read receipts
                    const filteredEntries = entries.filter(entry => {
                        // Don't report messages as visible/intersecting
                        if (entry.target.classList.contains('message') ||
                            entry.target.closest('.message') ||
                            entry.target.getAttribute('data-id') ||
                            entry.target.querySelector('[data-id]')) {
                            console.log("BLOCKED: Message intersection detection");
                            return false;
                        }
                        return true;
                    });
                    
                    if (filteredEntries.length > 0) {
                        return callback.call(this, filteredEntries, observer);
                    }
                };
                
                return new OriginalIntersectionObserver(modifiedCallback, options);
            };
        }
        
        // Block focus events on message containers
        document.addEventListener('focus', function(e) {
            if (e.target.closest('.message') || 
                e.target.classList.contains('message') ||
                e.target.getAttribute('data-id')) {
                console.log("BLOCKED: Message focus event");
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }, true);
        
        // Block scroll events that might trigger read detection
        let lastScrollTime = 0;
        document.addEventListener('scroll', function(e) {
            const now = Date.now();
            if (now - lastScrollTime > 100) { // Throttle
                console.log("BLOCKED: Scroll-based read detection");
                lastScrollTime = now;
            }
        }, true);
        
        console.log("Read detection prevention active");
    }
    
    function blockAllReadReceiptCommunication() {
        console.log(" Blocking all read receipt communication...");
        
        // Comprehensive WebSocket blocking
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            const ws = new OriginalWebSocket(url, protocols);
            
            if (url.includes('web.whatsapp.com') || url.includes('whatsapp')) {
                console.log("🔌 Intercepting WhatsApp WebSocket");
                
                const originalSend = ws.send;
                ws.send = function(data) {
                    let shouldBlock = false;
                    
                    try {
                        if (typeof data === 'string') {
                            // More comprehensive blocking patterns
                            const blockPatterns = [
                                'read', 'receipt', 'ack', 'seen', 'delivered',
                                'markAsRead', 'readReceipt', 'messageRead',
                                'chatRead', 'viewMessage', 'openMessage'
                            ];
                            
                            const lowerData = data.toLowerCase();
                            for (const pattern of blockPatterns) {
                                if (lowerData.includes(pattern)) {
                                    shouldBlock = true;
                                    break;
                                }
                            }
                            
                            try {
                                const parsed = JSON.parse(data);
                                if (Array.isArray(parsed)) {
                                    const jsonStr = JSON.stringify(parsed).toLowerCase();
                                    if (jsonStr.includes('read') || jsonStr.includes('receipt')) {
                                        shouldBlock = true;
                                    }
                                }
                            } catch (e) {
                                
                            }
                        } else if (data instanceof ArrayBuffer) {
                            // Convert binary data to check for patterns
                            const view = new Uint8Array(data);
                            const str = String.fromCharCode.apply(null, view);
                            if (str.includes('read') || str.includes('receipt')) {
                                shouldBlock = true;
                            }
                        }
                    } catch (e) {
                        console.warn("Error analyzing WebSocket data:", e);
                    }
                    
                    if (shouldBlock) {
                        console.log("BLOCKED WebSocket message:", data.toString().substring(0, 100));
                        return;
                    }
                    
                    return originalSend.apply(this, arguments);
                };
            }
            
            return ws;
        };
        
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (url && typeof url === 'string' && url.includes('whatsapp')) {
                const body = options?.body;
                if (body) {
                    const bodyStr = body.toString().toLowerCase();
                    if (bodyStr.includes('read') || 
                        bodyStr.includes('receipt') || 
                        bodyStr.includes('ack') ||
                        bodyStr.includes('seen')) {
                        console.log("BLOCKED fetch request");
                        return Promise.resolve(new Response('{"status":"success"}', { 
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        }));
                    }
                }
            }
            return originalFetch.apply(this, arguments);
        };
        
        console.log(" Communication blocking active");
    }
    
    function hijackWhatsAppInternals() {
        console.log(" Hijacking WhatsApp internals...");
        
        let patchAttempts = 0;
        const maxPatches = 300;
        
        function aggressivePatch() {
            if (patchAttempts >= maxPatches) return;
            patchAttempts++;
            
            try {
                if (window.webpackChunkwhatsapp_web_client) {
                    const chunk = window.webpackChunkwhatsapp_web_client;
                    
                    if (Array.isArray(chunk)) {
                        chunk.forEach((chunkData, index) => {
                            if (chunkData && chunkData[1]) {
                                patchChunkModules(chunkData[1]);
                            }
                        });
                    }
                    
                    if (typeof chunk.push === 'function' && !chunk.push.__ghostPatched) {
                        const originalPush = chunk.push;
                        chunk.push = function(chunkData) {
                            const result = originalPush.apply(this, arguments);
                            
                            if (chunkData && chunkData[1]) {
                                patchChunkModules(chunkData[1]);
                            }
                            
                            return result;
                        };
                        chunk.push.__ghostPatched = true;
                    }
                }
                
                if (window.Store) {
                    patchStoreCompletely(window.Store);
                }
                
                searchAndDestroyReadFunctions();
                
            } catch (e) {
                
            }
            
            setTimeout(aggressivePatch, 50);
        }
        
        function patchChunkModules(modules) {
            Object.keys(modules).forEach(moduleId => {
                const originalModule = modules[moduleId];
                modules[moduleId] = function(module, exports, require) {
                    const result = originalModule.apply(this, arguments);
                    
                    destroyReadReceiptFunctions(exports);
                    destroyReadReceiptFunctions(module);
                    destroyReadReceiptFunctions(module.exports);
                    
                    return result;
                };
            });
        }
        
        function destroyReadReceiptFunctions(obj, depth = 0) {
            if (!obj || depth > 5) return;
            
            try {
                Object.keys(obj).forEach(key => {
                    const value = obj[key];
                    
                    if (typeof value === 'function') {
                        const keyLower = key.toLowerCase();
                        if (keyLower.includes('read') || 
                            keyLower.includes('receipt') || 
                            keyLower.includes('ack') ||
                            keyLower.includes('seen') ||
                            keyLower.includes('mark')) {
                            
                            obj[key] = function() {
                                console.log(`🚫 DESTROYED function: ${key}`);
                                return Promise.resolve(true);
                            };
                        }
                    } else if (typeof value === 'object' && value !== null) {
                        destroyReadReceiptFunctions(value, depth + 1);
                    }
                });
            } catch (e) {
                // Ignore errors
            }
        }
        
        function patchStoreCompletely(Store) {
            Object.keys(Store).forEach(storeKey => {
                const storeObj = Store[storeKey];
                if (storeObj && typeof storeObj === 'object') {
                    destroyReadReceiptFunctions(storeObj);
                    
                    if (storeObj.prototype) {
                        destroyReadReceiptFunctions(storeObj.prototype);
                    }
                }
            });
        }
        
        function searchAndDestroyReadFunctions() {
            // Search window object
            Object.keys(window).forEach(key => {
                if (key.includes('whatsapp') || key.includes('WA') || key.includes('Chat')) {
                    destroyReadReceiptFunctions(window[key]);
                }
            });
        }
        
        aggressivePatch();
        console.log("Internal hijacking active");
    }
    
    function overrideVisibilityAPI() {
        console.log("Overriding visibility APIs...");
        
        Object.defineProperty(document, 'visibilityState', {
            get: () => 'hidden',
            configurable: false
        });
        
        Object.defineProperty(document, 'hidden', {
            get: () => true,
            configurable: false
        });
        
        document.addEventListener('visibilitychange', function(e) {
            console.log("BLOCKED visibilitychange event");
            e.stopImmediatePropagation();
            e.preventDefault();
        }, true);
        
        window.addEventListener('focus', function(e) {
            console.log("BLOCKED window focus");
            e.stopImmediatePropagation();
            e.preventDefault();
        }, true);
        
        const originalHasFocus = document.hasFocus;
        document.hasFocus = function() {
            return false;
        };
        
        console.log("Visibility override active");
    }
    
    setInterval(() => {
        if (!window.__GHOST_MODE_ACTIVE) {
            console.log("Re-initializing Ghost Mode");
            window.__GHOST_MODE_ACTIVE = true;
            hijackWhatsAppInternals();
        }
    }, 10000);
    
    console.log("GHOST MODE: Complete annihilation system active!");
    console.log("You are now completely invisible to read receipts!");
    
})();