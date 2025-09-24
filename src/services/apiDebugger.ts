// services/apiDebugger.ts
class APIDebugger {
  private calls: Array<{
    url: string;
    timestamp: Date;
    component: string;
    stackTrace: string;
  }> = [];

  logCall(url: string, component: string) {
    const call = {
      url,
      timestamp: new Date(),
      component,
      stackTrace: new Error().stack || ''
    };
    
    this.calls.push(call);
    
    console.log(`🚨 API CALL #${this.calls.length}`, {
      component,
      time: call.timestamp.toLocaleTimeString(),
      url: url.substring(0, 80) + '...'
    });
    
    // Log summary every 10 calls
    if (this.calls.length % 10 === 0) {
      this.printSummary();
    }
  }

  printSummary() {
    const summary = this.calls.reduce((acc, call) => {
      const key = `${call.component}-${call.url.split('function=')[1]?.split('&')[0]}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 API CALLS SUMMARY:', summary);
    console.log(`📈 Total calls in last minute: ${this.getCallsLastMinute()}`);
  }

  getCallsLastMinute() {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    return this.calls.filter(call => call.timestamp > oneMinuteAgo).length;
  }

  reset() {
    this.calls = [];
    console.log('🔄 API Debugger Reset');
  }
}

export const apiDebugger = new APIDebugger();

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).apiDebugger = apiDebugger;
}
