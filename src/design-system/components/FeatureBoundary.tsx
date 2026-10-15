import { Component, type ReactNode } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import styles from './FeatureBoundary.module.css';

interface Props {
  /** What this part of the screen is called, for the message. */
  name: string;
  children: ReactNode;
  /** Render nothing on failure (e.g. on the TV) instead of a message. */
  silent?: boolean;
}

/** Keeps one broken part of a screen from taking down the rest (PRD §10 Reliability). */
export class FeatureBoundary extends Component<Props, { error: boolean; key: number }> {
  state = { error: false, key: 0 };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: unknown) {
    console.error(`${this.props.name} failed`, error);
  }
  render() {
    if (!this.state.error)
      return (
        <div key={this.state.key} style={{ display: 'contents' }}>
          {this.props.children}
        </div>
      );
    if (this.props.silent) return null;
    return (
      <div className={styles.root} role="alert">
        <TriangleAlert size={18} aria-hidden />
        <span>{this.props.name} hit a problem. The rest of Lampstand still works.</span>
        <button
          type="button"
          className={styles.retry}
          onClick={() => this.setState((s) => ({ error: false, key: s.key + 1 }))}
        >
          <RotateCcw size={14} aria-hidden /> Try again
        </button>
      </div>
    );
  }
}
