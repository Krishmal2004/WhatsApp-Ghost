(function() {
    'use strict';
    
    console.log('Ghost Mode Content Script: Starting injection...');
    
    // Multiple injection attempts for reliability
    let injectionAttempts = 0;
    const maxAttempts = 5;
    
    function injectScript() {
        try {
            injectionAttempts++;
            
            // Create script element
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('inject.js');
            
            script.setAttribute('data-ghost-mode', 'true');
            
            if (document.querySelector('script[data-ghost-mode="true"]')) {
                console.log('Ghost Mode: Already injected, skipping...');
                return;
            }
            
            script.onload = function() {
                console.log('Ghost Mode: Injection successful');
                setTimeout(() => this.remove(), 1000);
            };
            
            script.onerror = function() {
                console.error('Ghost Mode: Injection failed, retry attempt:', injectionAttempts);
                this.remove();
                
                if (injectionAttempts < maxAttempts) {
                    setTimeout(injectScript, 2000);
                }
            };
            
            const insertionPoints = [
                document.head,
                document.documentElement,
                document.body
            ];
            
            let inserted = false;
            for (const point of insertionPoints) {
                if (point) {
                    point.appendChild(script);
                    inserted = true;
                    console.log('Ghost Mode: Script injected into', point.tagName);
                    break;
                }
            }
            
            if (!inserted) {
                console.error('Ghost Mode: No valid insertion point found');
                if (injectionAttempts < maxAttempts) {
                    setTimeout(injectScript, 2000);
                }
            }
            
        } catch (error) {
            console.error('Ghost Mode: Content script error:', error);
            if (injectionAttempts < maxAttempts) {
                setTimeout(injectScript, 2000);
            }
        }
    }
    
    // Initial injection
    injectScript();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(injectScript, 1000);
        });
    }
    
    window.addEventListener('load', () => {
        setTimeout(injectScript, 2000);
    });
    
})();