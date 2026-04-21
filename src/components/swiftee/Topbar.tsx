// Swiftee Topbar — brand + nav + Quick draft toggle + avatar
import React from 'react';
import { Icon, cx } from './atoms';

export type TopbarView = 'workspace' | 'bank' | 'quick';

export const SwifteeTopbar: React.FC<{
  view: TopbarView;
  onNav: (v: TopbarView) => void;
  userInitials?: string;
}> = ({ view, onNav, userInitials = 'SME' }) => (
  <div className="sw-topbar">
    <div className="sw-brand">
      <div className="sw-brand-mark">M</div>
      <div>
        <div className="sw-brand-name">CG-Matrix Gen</div>
        <div className="sw-brand-sub">Assessment Studio</div>
      </div>
    </div>
    <nav className="sw-topnav">
      <button className={view === 'workspace' ? 'on' : ''} onClick={() => onNav('workspace')}>Workspace</button>
      <button className={view === 'bank' ? 'on' : ''} onClick={() => onNav('bank')}>Item Bank</button>
    </nav>
    <div style={{ flex: 1 }} />
    <button
      onClick={() => onNav(view === 'quick' ? 'workspace' : 'quick')}
      className={cx('sw-btn sw-btn-sm', view === 'quick' ? 'sw-btn-primary' : 'sw-btn-ghost')}
    >
      <Icon name="bolt" size="sm" /> Quick draft
    </button>
    <div className="sw-avatar">{userInitials}</div>
  </div>
);
