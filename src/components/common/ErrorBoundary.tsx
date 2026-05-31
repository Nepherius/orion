import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Panel } from './Panel';

interface ErrorBoundaryProps {
  children: ReactNode;
  name?: string;
  resetKey?: string | number | null;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.name ?? 'View'} failed:`, error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <Panel className="border-red-900 bg-red-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div>
            <div className="font-semibold text-red-200">
              {this.props.name ?? 'This view'} could not render.
            </div>
            <div className="mt-1 text-sm text-red-200/80">{this.state.error.message}</div>
          </div>
        </div>
      </Panel>
    );
  }
}
