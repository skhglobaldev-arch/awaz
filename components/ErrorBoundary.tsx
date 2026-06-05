import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-white">
          <h2 className="text-2xl font-black mb-4">خطایی رخ داد</h2>
          <button 
            className="bg-white text-black px-6 py-2 rounded-lg font-bold"
            onClick={() => window.location.reload()}
          >
            تلاش مجدد
          </button>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}
