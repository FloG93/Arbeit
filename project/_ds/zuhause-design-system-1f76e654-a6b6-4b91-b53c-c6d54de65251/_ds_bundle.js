/* @ds-bundle: {"format":4,"namespace":"ZuhauseDesignSystem_1f76e6","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"Chip","sourcePath":"components/buttons/Button.jsx"},{"name":"ToggleSwitch","sourcePath":"components/controls/Controls.jsx"},{"name":"ProgressBar","sourcePath":"components/controls/Controls.jsx"},{"name":"StatusDot","sourcePath":"components/controls/Controls.jsx"},{"name":"Controls","sourcePath":"components/controls/Controls.jsx"},{"name":"Card","sourcePath":"components/surfaces/Surfaces.jsx"},{"name":"Tile","sourcePath":"components/surfaces/Surfaces.jsx"},{"name":"Surfaces","sourcePath":"components/surfaces/Surfaces.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"66efff96b458","components/controls/Controls.jsx":"bcf6dd503886","components/surfaces/Surfaces.jsx":"a2eaee6d6232"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ZuhauseDesignSystem_1f76e6 = window.ZuhauseDesignSystem_1f76e6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/buttons/Button.jsx
try { (() => {
function Button({
  variant = 'primary',
  active,
  children,
  onClick,
  style
}) {
  const base = {
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: 14,
    minHeight: 'var(--control-min-height)',
    padding: '0 18px',
    borderRadius: 'var(--radius-control-lg)',
    transition: 'var(--transition-control)',
    ...style
  };
  const variants = {
    primary: {
      border: 'none',
      background: 'var(--accent)',
      color: 'var(--text-on-accent)'
    },
    ghost: {
      border: '1px solid var(--border-strong)',
      background: 'transparent',
      color: 'var(--text-secondary-2)'
    },
    tab: {
      border: 'none',
      borderRadius: 'var(--radius-control)',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--text-on-accent)' : 'var(--text-tertiary)'
    },
    danger: {
      border: '1px solid rgba(240,99,99,.4)',
      background: 'transparent',
      color: 'var(--status-danger)'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      ...base,
      ...variants[variant]
    }
  }, children);
}
function Chip({
  selected,
  tone = 'accent',
  children,
  onClick,
  style
}) {
  const bg = selected ? tone === 'accent' ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 16%, var(--surface-tile))' : 'var(--surface-tile)';
  const fg = selected && tone === 'accent' ? 'var(--text-on-accent)' : selected ? 'var(--text-primary-2)' : 'var(--text-tertiary)';
  const border = selected ? tone === 'accent' ? 'var(--accent)' : 'var(--accent)' : 'var(--border-medium)';
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '0 14px',
      minHeight: 40,
      borderRadius: 'var(--radius-pill)',
      border: '1px solid ' + border,
      background: bg,
      color: fg,
      fontFamily: 'var(--font-ui)',
      fontWeight: 500,
      fontSize: 13,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Button, Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/controls/Controls.jsx
try { (() => {
function ToggleSwitch({
  on,
  onChange
}) {
  return /*#__PURE__*/React.createElement("span", {
    onClick: onChange,
    style: {
      cursor: 'pointer',
      position: 'relative',
      width: 46,
      height: 28,
      borderRadius: 'var(--radius-pill)',
      background: on ? 'var(--accent)' : 'var(--surface-track-off)',
      transition: 'var(--transition-control)',
      display: 'inline-block'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: 3,
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,.4)',
      transition: 'transform .2s',
      transform: on ? 'translateX(18px)' : 'translateX(0)'
    }
  }));
}
function ProgressBar({
  value,
  color = 'var(--accent)',
  height = 6
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-track)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: Math.max(0, Math.min(100, value)) + '%',
      background: color
    }
  }));
}
function StatusDot({
  color = 'var(--status-neutral-dot)',
  glow,
  pulse,
  size = 9
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'inline-block',
      background: color,
      boxShadow: glow ? `0 0 8px ${color}` : 'none',
      animation: pulse ? 'fdpulse 2s infinite' : 'none'
    }
  });
}

// Namespace export so this grouping file (ToggleSwitch, ProgressBar, StatusDot) is
// addressable as "Controls" too, matching the file/props-contract name.
const Controls = {
  ToggleSwitch,
  ProgressBar,
  StatusDot
};
Object.assign(__ds_scope, { ToggleSwitch, ProgressBar, StatusDot, Controls });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/Controls.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Surfaces.jsx
try { (() => {
function Card({
  title,
  action,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-card)',
      padding: 'var(--card-padding)',
      boxShadow: 'var(--shadow-card)',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      ...style
    }
  }, (title || action) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }
  }, title && /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--text-eyebrow)',
      letterSpacing: 'var(--eyebrow-tracking)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, title), action), children);
}
function Tile({
  name,
  meta,
  active,
  dot,
  onClick,
  children
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 16,
      minHeight: 98,
      padding: 15,
      borderRadius: 'var(--radius-tile-lg)',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'var(--transition-control)',
      color: 'inherit',
      border: '1px solid ' + (active ? 'color-mix(in srgb, var(--accent) 45%, transparent)' : 'var(--border-subtle)'),
      background: active ? 'color-mix(in srgb, var(--accent) 13%, var(--surface-card))' : 'var(--surface-tile)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-label)',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary-2)'
    }
  }, name), dot !== false && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: '50%',
      marginTop: 2,
      background: active ? 'var(--accent)' : 'var(--status-neutral-dot)',
      boxShadow: active ? '0 0 12px var(--accent)' : 'none'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--text-micro)',
      color: 'var(--text-muted)'
    }
  }, meta), children);
}

// Namespace export so this grouping file (Card, Tile) is addressable as "Surfaces"
// too, matching the file/props-contract name.
const Surfaces = {
  Card,
  Tile
};
Object.assign(__ds_scope, { Card, Tile, Surfaces });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Surfaces.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.ToggleSwitch = __ds_scope.ToggleSwitch;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.StatusDot = __ds_scope.StatusDot;

__ds_ns.Controls = __ds_scope.Controls;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tile = __ds_scope.Tile;

__ds_ns.Surfaces = __ds_scope.Surfaces;

})();
