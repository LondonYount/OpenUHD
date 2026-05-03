import type { ModuleDef } from "../types/module.js";
import type { HarnessDef } from "../types/harness.js";
import type { InterfaceDef } from "../types/interface.js";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function protocolBadge(iface: InterfaceDef): string {
  const protos = iface.protocols.map((p) => {
    const roles = p.roles.join("/");
    return `<span class="proto-badge proto-${p.type}">${p.type}.${roles}</span>`;
  });
  return protos.join(" ");
}

function interfaceRow(iface: InterfaceDef, compact = false): string {
  const activeClass = iface.default_active === false ? "inactive" : "active";
  const slots = iface.slots?.length ?? 0;
  const profiles = iface.profiles?.length ?? 0;
  const caps = iface.capabilities?.length ? `<span class="caps">[${iface.capabilities.join(", ")}]</span>` : "";

  const detail = compact
    ? ""
    : `${slots > 0 ? `<span class="meta">${slots} slots</span>` : ""}${profiles > 0 ? `<span class="meta">${profiles} profiles</span>` : ""}`;

  return `<div class="iface ${activeClass}" title="${escapeHtml(iface.name ?? iface.id)}">
    <span class="iface-id">${escapeHtml(iface.id)}</span>
    ${protocolBadge(iface)}
    ${caps}
    ${detail}
  </div>`;
}

function renderModuleBox(mod: ModuleDef, isChild = false): string {
  const leafInterfaces = mod.interfaces.filter((i) => !i.slots?.length);
  const composedInterfaces = mod.interfaces.filter((i) => (i.slots?.length ?? 0) > 0);

  const tag = isChild ? "div" : "section";

  return `<${tag} class="module ${isChild ? "child-module" : "root-module"}">
    <div class="module-header">
      <span class="module-name">${escapeHtml(mod.name)}</span>
      <span class="module-id">${escapeHtml(mod.id)}</span>
      ${mod.tags?.length ? `<span class="module-tags">${mod.tags.join(", ")}</span>` : ""}
    </div>
    ${composedInterfaces.length > 0 ? `
    <div class="iface-section">
      <div class="iface-section-label">Composed Interfaces</div>
      ${composedInterfaces.map((i) => interfaceRow(i)).join("\n")}
    </div>` : ""}
    ${leafInterfaces.length > 0 ? `
    <div class="iface-section">
      <div class="iface-section-label">Leaf Interfaces (${leafInterfaces.length})</div>
      <div class="leaf-grid">
        ${leafInterfaces.map((i) => interfaceRow(i, true)).join("\n")}
      </div>
    </div>` : ""}
  </${tag}>`;
}

function renderHarnessPairView(
  harness: HarnessDef,
  parentModule: ModuleDef,
  childDefs: Record<string, ModuleDef>,
): string {
  const resolveEndpoint = (ep: typeof harness.endpoints[0]) => {
    if (!ep.childModuleId) {
      // References parent module's own interface
      const iface = parentModule.interfaces.find((i) => i.id === ep.interfaceId);
      return { moduleName: parentModule.name, moduleId: parentModule.id, iface };
    }
    const child = parentModule.children?.find((c) => c.id === ep.childModuleId);
    const childDef = child ? childDefs[child.moduleDefId] : undefined;
    const iface = childDef?.interfaces.find((i) => i.id === ep.interfaceId);
    return { moduleName: childDef?.name ?? ep.childModuleId, moduleId: ep.childModuleId, iface };
  };

  const endpointRows = harness.endpoints.map((ep, i) => {
    const resolved = resolveEndpoint(ep);
    const letter = String.fromCharCode(65 + i); // A, B, C...

    const ifaceDetail = resolved.iface
      ? `<div class="ep-iface">${interfaceRow(resolved.iface)}</div>`
      : `<div class="ep-iface unresolved">unresolved</div>`;

    const profileTag = ep.profileInstanceId
      ? `<span class="profile-tag">profile: ${ep.profileInstanceId}</span>`
      : "";

    return `<div class="endpoint">
      <div class="ep-letter">${letter}</div>
      <div class="ep-detail">
        <div class="ep-module">${escapeHtml(resolved.moduleName)}</div>
        <div class="ep-label">${escapeHtml(ep.label)}</div>
        ${profileTag}
        ${ifaceDetail}
      </div>
    </div>`;
  });

  return `<div class="harness-pair">
    <div class="harness-header">
      <span class="harness-name">${escapeHtml(harness.name ?? harness.id)}</span>
      <span class="harness-topology topology-${harness.topology}">${harness.topology}</span>
      <span class="harness-domain">${harness.domain}</span>
    </div>
    <div class="endpoints">
      ${endpointRows.join(`<div class="harness-line">───</div>`)}
    </div>
  </div>`;
}

function renderSystemView(mod: ModuleDef, childDefs: Record<string, ModuleDef>): string {
  const children = mod.children ?? [];
  const harnesses = mod.harnesses ?? [];

  // Build a connection summary: child → child connections via harnesses
  const connections: { harnessId: string; name: string; topology: string; from: string; to: string[] }[] = [];

  for (const h of harnesses) {
    const endpoints = h.endpoints.map((ep) => {
      const label = ep.childModuleId ?? mod.id;
      const suffix = ep.profileInstanceId ? `.${ep.profileInstanceId}` : "";
      return `${label}${ep.interfaceId ? `.${ep.interfaceId}` : ""}${suffix}`;
    });

    connections.push({
      harnessId: h.id,
      name: h.name ?? h.id,
      topology: h.topology,
      from: endpoints[0],
      to: endpoints.slice(1),
    });
  }

  return `<section class="system-view">
    <h2>System View: ${escapeHtml(mod.name)}</h2>
    <div class="system-layout">
      <div class="parent-box">
        <div class="parent-label">${escapeHtml(mod.name)}</div>
        <div class="children-grid">
          ${children.map((c) => {
            const childDef = childDefs[c.moduleDefId];
            return `<div class="child-box">
              <div class="child-name">${escapeHtml(childDef?.name ?? c.moduleDefId)}</div>
              <div class="child-ref">${escapeHtml(c.id)}</div>
            </div>`;
          }).join("\n")}
        </div>
      </div>
      <div class="connection-list">
        <h3>Connections</h3>
        ${connections.map((c, i) => {
          const letter = String.fromCharCode(65 + i);
          return `<div class="connection">
            <span class="conn-id">${letter}</span>
            <span class="conn-name">${escapeHtml(c.name)}</span>
            <span class="harness-topology topology-${c.topology}">${c.topology}</span>
            <span class="conn-path">${escapeHtml(c.from)} → ${c.to.map(escapeHtml).join(", ")}</span>
          </div>`;
        }).join("\n")}
      </div>
    </div>
  </section>`;
}

export function renderVisualization(
  rootModule: ModuleDef,
  childDefs: Record<string, ModuleDef>,
): string {
  const harnesses = rootModule.harnesses ?? [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(rootModule.name)} — UHD Visualizer</title>
<style>
  :root {
    --bg: #0d1117; --surface: #161b22; --surface2: #21262d; --border: #30363d;
    --text: #e6edf3; --text-muted: #7d8590; --accent: #58a6ff; --green: #3fb950;
    --orange: #d29922; --red: #f85149; --purple: #bc8cff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; background: var(--bg); color: var(--text); padding: 24px; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 24px; color: var(--accent); }
  h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text); }
  h3 { font-size: 13px; font-weight: 600; margin: 12px 0 8px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

  .system-view { margin-bottom: 40px; }
  .parent-box { border: 2px solid var(--accent); border-radius: 8px; padding: 16px; background: var(--surface); }
  .parent-label { font-size: 14px; font-weight: 600; color: var(--accent); margin-bottom: 12px; }
  .children-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .child-box { border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; background: var(--surface2); min-width: 120px; }
  .child-name { font-weight: 600; font-size: 12px; }
  .child-ref { font-size: 11px; color: var(--text-muted); }

  .connection-list { margin-top: 16px; }
  .connection { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--surface2); }
  .conn-id { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: var(--bg); font-weight: 700; font-size: 11px; flex-shrink: 0; }
  .conn-name { font-weight: 600; min-width: 160px; }
  .conn-path { color: var(--text-muted); font-size: 12px; }

  .harness-topology { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .topology-wire { background: #1f3a2a; color: var(--green); }
  .topology-bus { background: #2a1f3a; color: var(--purple); }
  .topology-split { background: #3a2a1f; color: var(--orange); }
  .topology-or { background: #3a1f1f; color: var(--red); }

  .pair-view { margin-top: 32px; }
  .harness-pair { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
  .harness-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--surface2); border-bottom: 1px solid var(--border); }
  .harness-name { font-weight: 600; }
  .harness-domain { color: var(--text-muted); font-size: 11px; }

  .endpoints { padding: 12px; }
  .endpoint { display: flex; gap: 12px; padding: 8px; background: var(--surface); border-radius: 6px; margin-bottom: 4px; }
  .ep-letter { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: var(--surface2); border: 1px solid var(--border); font-weight: 700; flex-shrink: 0; }
  .ep-module { font-weight: 600; font-size: 12px; }
  .ep-label { color: var(--text-muted); font-size: 11px; }
  .ep-iface { margin-top: 4px; }

  .harness-line { text-align: center; color: var(--border); font-size: 16px; padding: 2px 0; }

  .iface { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border); margin: 2px; font-size: 12px; }
  .iface.active { border-color: var(--green); }
  .iface.inactive { border-color: var(--border); opacity: 0.5; }
  .iface-id { font-weight: 600; }

  .proto-badge { padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 600; }
  .proto-i2c { background: #1a3a5c; color: #79c0ff; }
  .proto-spi { background: #3a1a5c; color: #d2a8ff; }
  .proto-uart { background: #5c3a1a; color: #ffd28a; }
  .proto-power { background: #1a5c1a; color: #7ee787; }
  .proto-digital { background: #2d333b; color: #adbac7; }
  .proto-pwm { background: #5c1a3a; color: #ff9bce; }
  .proto-analog { background: #1a5c5c; color: #79dfc1; }
  .proto-motor_control { background: #5c4a1a; color: #e3b341; }
  .proto-interrupt { background: #5c1a1a; color: #ffa198; }

  .profile-tag { font-size: 10px; color: var(--orange); border: 1px solid var(--orange); padding: 0 4px; border-radius: 3px; }
  .caps { color: var(--text-muted); font-size: 10px; }
  .meta { color: var(--text-muted); font-size: 10px; margin-left: 4px; }

  .leaf-grid { display: flex; flex-wrap: wrap; gap: 2px; }
  .iface-section { margin: 8px 0; }
  .iface-section-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }

  .module { margin-bottom: 24px; }
  .module-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
  .module-name { font-size: 16px; font-weight: 700; }
  .module-id { color: var(--text-muted); font-size: 12px; }
  .module-tags { color: var(--text-muted); font-size: 11px; }

  .root-module { border: 1px solid var(--border); border-radius: 8px; padding: 16px; background: var(--surface); }
  .section-divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
</style>
</head>
<body>
  <h1>${escapeHtml(rootModule.name)} — UHD Visualizer</h1>

  ${renderSystemView(rootModule, childDefs)}

  <hr class="section-divider">

  <div class="pair-view">
    <h2>Harness Detail View</h2>
    ${harnesses.map((h) => renderHarnessPairView(h, rootModule, childDefs)).join("\n")}
  </div>

  <hr class="section-divider">

  <h2>Module Definitions</h2>
  ${renderModuleBox(rootModule)}
  ${Object.values(childDefs).map((d) => renderModuleBox(d)).join("\n")}
</body>
</html>`;
}
