import type { ModuleDef } from "../types/module.js";
import type { HarnessDef, HarnessEndpointDef } from "../types/harness.js";
import type { InterfaceDef } from "../types/interface.js";

interface ResolvedEndpoint {
  moduleName: string;
  moduleId: string;
  iface?: InterfaceDef;
  profileId?: string;
  ep: HarnessEndpointDef;
}

function resolveEndpoint(
  ep: HarnessEndpointDef,
  parentModule: ModuleDef,
  childDefs: Record<string, ModuleDef>,
): ResolvedEndpoint {
  if (!ep.childModuleId) {
    const iface = parentModule.interfaces.find((i) => i.id === ep.interfaceId);
    return { moduleName: parentModule.name, moduleId: parentModule.id, iface, profileId: ep.profileInstanceId, ep };
  }
  const child = parentModule.children?.find((c) => c.id === ep.childModuleId);
  const childDef = child ? childDefs[child.moduleDefId] : undefined;
  const iface = childDef?.interfaces.find((i) => i.id === ep.interfaceId);
  return {
    moduleName: childDef?.name ?? ep.childModuleId,
    moduleId: ep.childModuleId,
    iface,
    profileId: ep.profileInstanceId,
    ep,
  };
}

interface FunnelLine {
  leftText: string;
  rightText: string;
  centerText: string;
  indent: number; // 0 = leaves, 1 = slots, 2 = interface, 3 = top-level
}

function buildFunnelLines(
  leftResolved: ResolvedEndpoint,
  rightResolved: ResolvedEndpoint,
  leftModule: ModuleDef | undefined,
  rightModule: ModuleDef | undefined,
): FunnelLine[] {
  const lines: FunnelLine[] = [];
  const leftIface = leftResolved.iface;
  const rightIface = rightResolved.iface;

  if (!leftIface || !rightIface) {
    // Unresolved — just show the top-level connection
    const leftLabel = leftResolved.iface?.id ?? leftResolved.ep.label;
    const rightLabel = rightResolved.iface?.id ?? rightResolved.ep.label;
    lines.push({
      leftText: leftLabel,
      rightText: rightLabel,
      centerText: "──",
      indent: 0,
    });
    return lines;
  }

  const leftSlots = leftIface.slots ?? [];
  const rightSlots = rightIface.slots ?? [];
  const leftProfile = leftResolved.profileId
    ? leftIface.profiles?.find((p) => p.id === leftResolved.profileId)
    : undefined;
  const rightProfile = rightResolved.profileId
    ? rightIface.profiles?.find((p) => p.id === rightResolved.profileId)
    : undefined;

  // Level 0: Leaf-to-profile bindings (left side)
  if (leftProfile && leftModule) {
    for (const [slotId, boundTo] of Object.entries(leftProfile.bindings)) {
      const ids = Array.isArray(boundTo) ? boundTo : [boundTo];
      for (const id of ids) {
        lines.push({ leftText: id, rightText: "", centerText: "", indent: 0 });
      }
    }
    lines.push({ leftText: `[${leftProfile.id}]`, rightText: "", centerText: "", indent: 0 });
  }

  // Level 0: Leaf-to-profile bindings (right side) — collect for later
  const rightLeafLines: { slotId: string; leafId: string }[] = [];
  if (rightProfile && rightModule) {
    for (const [slotId, boundTo] of Object.entries(rightProfile.bindings)) {
      const ids = Array.isArray(boundTo) ? boundTo : [boundTo];
      for (const id of ids) {
        rightLeafLines.push({ slotId, leafId: id });
      }
    }
  }

  // Level 1: Slot-to-slot connections
  // Match slots by ID across both interfaces
  if (leftSlots.length > 0 && rightSlots.length > 0) {
    for (const lSlot of leftSlots) {
      const rSlot = rightSlots.find((s) => s.id === lSlot.id);
      if (rSlot) {
        const proto = lSlot.match.protocol ?? "";
        lines.push({
          leftText: lSlot.id,
          rightText: rSlot.id,
          centerText: `${lSlot.id} ↔ ${rSlot.id}`,
          indent: 1,
        });
      }
    }
  } else if (leftSlots.length > 0) {
    // Left has slots, right is a leaf composed interface (like VL53L0X i2c — no internal slots)
    // Show left slots matching conceptually
    for (const lSlot of leftSlots) {
      lines.push({
        leftText: lSlot.id,
        rightText: lSlot.id,
        centerText: `${lSlot.id} ↔ ${lSlot.id}`,
        indent: 1,
      });
    }
  } else if (rightSlots.length > 0) {
    for (const rSlot of rightSlots) {
      lines.push({
        leftText: rSlot.id,
        rightText: rSlot.id,
        centerText: `${rSlot.id} ↔ ${rSlot.id}`,
        indent: 1,
      });
    }
  }

  // Level 2: Interface-level match
  const leftProto = leftIface.protocols[0];
  const rightProto = rightIface.protocols[0];
  if (leftProto && rightProto) {
    const lRole = leftProto.roles[0] ?? "";
    const rRole = rightProto.roles[0] ?? "";
    lines.push({
      leftText: `${leftIface.id} ${lRole}`,
      rightText: `${rRole} ${rightIface.id}`,
      centerText: `${leftProto.type}.${lRole} ↔ ${rRole}`,
      indent: 2,
    });
  }

  return lines;
}

function pad(s: string, len: number, align: "left" | "right" = "left"): string {
  if (s.length >= len) return s.substring(0, len);
  return align === "right" ? s.padStart(len) : s.padEnd(len);
}

function renderPairAscii(
  harness: HarnessDef,
  parentModule: ModuleDef,
  childDefs: Record<string, ModuleDef>,
): string {
  if (harness.endpoints.length < 2) return "";

  const pairs: [HarnessEndpointDef, HarnessEndpointDef][] = [];
  if (harness.endpoints.length === 2) {
    pairs.push([harness.endpoints[0], harness.endpoints[1]]);
  } else {
    for (let i = 1; i < harness.endpoints.length; i++) {
      pairs.push([harness.endpoints[0], harness.endpoints[i]]);
    }
  }

  const sections: string[] = [];

  for (const [epA, epB] of pairs) {
    const leftResolved = resolveEndpoint(epA, parentModule, childDefs);
    const rightResolved = resolveEndpoint(epB, parentModule, childDefs);

    let leftIface = leftResolved.iface;
    let rightIface = rightResolved.iface;

    // Detect compositional match: one side has a composed interface, the other has none.
    // Create a synthetic "inferred" interface for the unresolved side.
    let leftInferred = false;
    let rightInferred = false;

    if (!leftIface && rightIface && (rightIface.slots?.length ?? 0) > 0) {
      // Right has composed interface, left is unresolved → left gets inferred
      const proto = rightIface.protocols[0];
      if (proto) {
        const inferredRole = proto.roles[0] === "target" ? "source"
          : proto.roles[0] === "slave" ? "master"
          : proto.roles[0] === "input" ? "output"
          : "controller";
        leftIface = {
          id: `{inferred}`,
          name: `${proto.type}`,
          domain: rightIface.domain,
          exposed: true,
          protocols: [{ type: proto.type, roles: [inferredRole] }],
          // Mirror the slots for display
          slots: rightIface.slots,
        };
        leftInferred = true;
      }
    } else if (!rightIface && leftIface && (leftIface.slots?.length ?? 0) > 0) {
      const proto = leftIface.protocols[0];
      if (proto) {
        const inferredRole = proto.roles[0] === "target" ? "source"
          : proto.roles[0] === "slave" ? "master"
          : proto.roles[0] === "input" ? "output"
          : "controller";
        rightIface = {
          id: `{inferred}`,
          name: `${proto.type}`,
          domain: leftIface.domain,
          exposed: true,
          protocols: [{ type: proto.type, roles: [inferredRole] }],
          slots: leftIface.slots,
        };
        rightInferred = true;
      }
    }

    const leftProfile = leftResolved.profileId
      ? leftIface?.profiles?.find((p) => p.id === leftResolved.profileId)
      : undefined;
    const rightProfile = rightResolved.profileId
      ? rightIface?.profiles?.find((p) => p.id === rightResolved.profileId)
      : undefined;

    const COL = 28;
    const MID = 34;

    const out: string[] = [];

    // Header
    out.push(`  ${pad(leftResolved.moduleName, COL + 2)}${" ".repeat(MID)}${rightResolved.moduleName}`);

    // Box top
    out.push(`  ┌${"─".repeat(COL)}┐${" ".repeat(MID)}┌${"─".repeat(COL)}┐`);

    const blank = () => {
      out.push(`  │${" ".repeat(COL)}│${" ".repeat(MID)}│${" ".repeat(COL)}│`);
    };

    const innerLine = (left: string, right: string) => {
      out.push(`  │${pad(left, COL, "right")}│${" ".repeat(MID)}│${pad(right, COL)}│`);
    };

    const crossLine = (left: string, center: string, right: string) => {
      const l = pad(left, COL, "right");
      const r = pad(right, COL);
      // ┼ replaces the inner │ on each side of the gap.
      // mid content must be exactly MID chars: ──{left fill}{center}{right fill}──
      // Reserve 2 chars each side for ── delimiters = MID - 4 inner chars
      const innerWidth = MID - 4;
      const padded = ` ${center} `;
      const textLen = padded.length;
      const leftFill = Math.floor((innerWidth - textLen) / 2);
      const rightFill = innerWidth - textLen - leftFill;
      const mid = "─".repeat(Math.max(0, leftFill)) + padded + "─".repeat(Math.max(0, rightFill));
      out.push(`  │${l}┼──${mid}──┼${r}│`);
    };

    blank();

    // Collect data
    const leftSlots = leftIface?.slots ?? [];
    const rightSlots = rightIface?.slots ?? [];
    const leftBindings: { slotId: string; leafId: string }[] = [];
    const rightBindings: { slotId: string; leafId: string }[] = [];

    if (leftProfile) {
      for (const [slotId, boundTo] of Object.entries(leftProfile.bindings)) {
        const ids = Array.isArray(boundTo) ? boundTo : [boundTo];
        for (const id of ids) leftBindings.push({ slotId, leafId: id });
      }
    }
    if (rightProfile) {
      for (const [slotId, boundTo] of Object.entries(rightProfile.bindings)) {
        const ids = Array.isArray(boundTo) ? boundTo : [boundTo];
        for (const id of ids) rightBindings.push({ slotId, leafId: id });
      }
    }

    // --- Tiered funnel rendering ---
    // Each tier indents outward toward the box wall / crossing line.
    // Leaves are innermost, slots are middle, interface is outermost.
    //
    // LEFT side (crossing exits right):
    //   leaves merge → stem drops → slots merge → stem drops → interface ──┼
    //   (leftmost)     (middle)                   (rightmost)
    //
    // RIGHT side (crossing exits left):
    //   ┼── interface  stem drops → slots merge → stem drops → leaves merge
    //   (leftmost)                  (middle)                  (rightmost)

    const LEAF_MARGIN = 6;  // leaf merge point: this many chars from box wall
    const SLOT_MARGIN = 3;  // slot merge point: this many chars from box wall

    // Helper: render a left-side inner line with trailing margin
    const leftInner = (text: string, margin: number): string => {
      const content = text + " ".repeat(margin);
      return pad(content, COL, "right");
    };

    // Helper: render a right-side inner line with leading margin
    const rightInner = (text: string, margin: number): string => {
      const content = " ".repeat(margin) + text;
      return pad(content, COL);
    };

    // Build left and right non-crossing lines for each tier
    const leftLeafLines: string[] = [];
    const rightLeafLines: string[] = [];

    // Tier 0: Leaves → Profile
    if (leftBindings.length > 0) {
      for (let i = 0; i < leftBindings.length; i++) {
        const c = i === 0 && leftBindings.length === 1 ? "─"
                : i === 0 ? "┐" : i === leftBindings.length - 1 ? "┘" : "┤";
        leftLeafLines.push(leftInner(`${leftBindings[i].leafId} ──${c}`, LEAF_MARGIN));
      }
      if (leftProfile) {
        leftLeafLines.push(leftInner(`[${leftProfile.id}]`, LEAF_MARGIN));
      }
      leftLeafLines.push(leftInner("│", LEAF_MARGIN));
    }

    if (rightBindings.length > 0) {
      for (let i = 0; i < rightBindings.length; i++) {
        const c = i === 0 && rightBindings.length === 1 ? "─"
                : i === 0 ? "┌" : i === rightBindings.length - 1 ? "└" : "├";
        rightLeafLines.push(rightInner(`${c}── ${rightBindings[i].leafId}`, LEAF_MARGIN));
      }
      if (rightProfile) {
        rightLeafLines.push(rightInner(`[${rightProfile.id}]`, LEAF_MARGIN));
      }
      rightLeafLines.push(rightInner("│", LEAF_MARGIN));
    }

    // Render leaf tier (left and right padded to same height)
    const maxLeafLines = Math.max(leftLeafLines.length, rightLeafLines.length);
    for (let i = 0; i < maxLeafLines; i++) {
      const l = leftLeafLines[i] ?? " ".repeat(COL);
      const r = rightLeafLines[i] ?? " ".repeat(COL);
      out.push(`  │${l}│${" ".repeat(MID)}│${r}│`);
    }

    // Tier 1: Slot crossing lines (with merge connectors at SLOT_MARGIN)
    const allSlotIds: string[] = [];
    for (const s of leftSlots) if (!allSlotIds.includes(s.id)) allSlotIds.push(s.id);
    for (const s of rightSlots) if (!allSlotIds.includes(s.id)) allSlotIds.push(s.id);

    if (allSlotIds.length > 0) {
      for (let i = 0; i < allSlotIds.length; i++) {
        const id = allSlotIds[i];
        const isOnly = allSlotIds.length === 1;
        const isFirst = i === 0;
        const isLast = i === allSlotIds.length - 1;

        // Left side: slot name + connector + ─── fill to wall
        let lText: string;
        if (leftBindings.length > 0) {
          const c = isOnly ? "─" : isFirst ? "┐" : isLast ? "┘" : "┤";
          const content = `${id} ──${c}`;
          const fill = "─".repeat(Math.max(0, SLOT_MARGIN - 1));
          lText = pad(content + fill, COL, "right");
        } else {
          lText = pad(`${id} ──`, COL, "right");
        }

        // Right side: ─── fill from wall + connector + slot name
        let rText: string;
        if (rightBindings.length > 0) {
          const c = isOnly ? "─" : isFirst ? "┌" : isLast ? "└" : "├";
          const fill = "─".repeat(Math.max(0, SLOT_MARGIN - 1));
          const content = `${fill}${c}── ${id}`;
          rText = pad(content, COL);
        } else {
          rText = pad(`── ${id}`, COL);
        }

        // Build crossing line with centered text
        const centerText = `${id} ↔ ${id}`;
        const innerW = MID - 4;
        const pText = ` ${centerText} `;
        const lFill = Math.floor((innerW - pText.length) / 2);
        const rFill = innerW - pText.length - lFill;
        const mid = "─".repeat(Math.max(0, lFill)) + pText + "─".repeat(Math.max(0, rFill));
        out.push(`  │${lText}┼──${mid}──┼${rText}│`);
      }

      // Stem between slots and interface
      if (leftIface && rightIface) {
        const l = leftSlots.length > 0
          ? leftInner("│", SLOT_MARGIN)
          : " ".repeat(COL);
        const r = rightSlots.length > 0
          ? rightInner("│", SLOT_MARGIN)
          : " ".repeat(COL);
        out.push(`  │${l}│${" ".repeat(MID)}│${r}│`);
      }
    }

    // Tier 2: Interface protocol crossing line (at the box wall, no margin)
    if (leftIface && rightIface) {
      const lp = leftIface.protocols[0];
      const rp = rightIface.protocols[0];
      if (lp && rp) {
        const lRole = lp.roles[0] ?? "";
        const rRole = rp.roles[0] ?? "";
        // Truncate long names to fit in COL
        const maxNameLen = COL - lRole.length - 5; // " ──" + space + role
        const lName = leftInferred ? `*${lp.type}` : leftIface.id;
        const rName = rightInferred ? `*${rp.type}` : rightIface.id;
        const lTrunc = lName.length > maxNameLen ? lName.slice(0, maxNameLen) : lName;
        const rTrunc = rName.length > maxNameLen ? rName.slice(0, maxNameLen) : rName;
        const lLabel = `${lTrunc} ${lRole} ──`;
        const rLabel = `── ${rRole} ${rTrunc}`;
        crossLine(lLabel, `${lp.type}.${lRole} ↔ ${rRole}`, rLabel);
      }
    }

    blank();
    out.push(`  └${"─".repeat(COL)}┘${" ".repeat(MID)}└${"─".repeat(COL)}┘`);

    sections.push(out.join("\n"));
  }

  return sections.join("\n\n");
}

function renderSystemAscii(
  mod: ModuleDef,
  childDefs: Record<string, ModuleDef>,
): string {
  const children = mod.children ?? [];
  const harnesses = mod.harnesses ?? [];

  const BOX_W = 14;

  const childBoxes = children.map((c) => {
    const def = childDefs[c.moduleDefId];
    const shortName = def?.name?.split(" ").slice(0, 2).join(" ") ?? c.moduleDefId;
    return { id: c.id, name: shortName };
  });

  // Layout children in rows of 3
  const rows: typeof childBoxes[] = [];
  for (let i = 0; i < childBoxes.length; i += 3) {
    rows.push(childBoxes.slice(i, i + 3));
  }

  const out: string[] = [];
  const innerWidth = 60;
  const title = ` ${mod.name} `;
  const titlePad = Math.max(0, Math.floor((innerWidth - title.length) / 2));

  out.push(`┌${"─".repeat(titlePad)}${title}${"─".repeat(Math.max(0, innerWidth - titlePad - title.length))}┐`);
  out.push(`│${" ".repeat(innerWidth)}│`);

  // Build harness participation map: childId → list of harness letters
  const harnessMap: Record<string, string[]> = {};
  // Also track parent module participation
  const parentHarnesses: string[] = [];

  for (let i = 0; i < harnesses.length; i++) {
    const letter = String.fromCharCode(65 + i);
    for (const ep of harnesses[i].endpoints) {
      if (ep.childModuleId) {
        if (!harnessMap[ep.childModuleId]) harnessMap[ep.childModuleId] = [];
        if (!harnessMap[ep.childModuleId].includes(letter)) {
          harnessMap[ep.childModuleId].push(letter);
        }
      } else {
        if (!parentHarnesses.includes(letter)) parentHarnesses.push(letter);
      }
    }
  }

  for (const row of rows) {
    // Box top
    let line0 = "│  ";
    let line1 = "│  ";
    let line2 = "│  ";
    // Box bottom with harness stubs punched through
    let line3 = "│  ";
    // Harness stub vertical lines
    let line4 = "│  ";
    // Harness letters
    let line5 = "│  ";

    for (const box of row) {
      const letters = harnessMap[box.id] ?? [];
      const GAP = 2; // space between boxes

      // Build the bottom border with ┬ where harness stubs go
      // Space the stubs evenly within the box width
      let bottom = "─".repeat(BOX_W);
      let stubs = " ".repeat(BOX_W);
      let labels = " ".repeat(BOX_W);

      if (letters.length > 0) {
        // Calculate positions: evenly spaced within the box
        const spacing = Math.floor(BOX_W / (letters.length + 1));
        const positions: number[] = [];
        for (let li = 0; li < letters.length; li++) {
          positions.push(spacing * (li + 1));
        }

        // Build bottom border with ┬ at positions
        const bottomChars = "─".repeat(BOX_W).split("");
        const stubChars = " ".repeat(BOX_W).split("");
        const labelChars = " ".repeat(BOX_W).split("");

        for (let li = 0; li < letters.length; li++) {
          const pos = positions[li];
          if (pos < BOX_W) {
            bottomChars[pos] = "┬";
            stubChars[pos] = "│";
            labelChars[pos] = letters[li];
          }
        }

        bottom = bottomChars.join("");
        stubs = stubChars.join("");
        labels = labelChars.join("");
      }

      line0 += `┌${"─".repeat(BOX_W)}┐` + " ".repeat(GAP);
      line1 += `│${pad(box.name, BOX_W)}│` + " ".repeat(GAP);
      line2 += `│${pad(box.id, BOX_W)}│` + " ".repeat(GAP);
      line3 += `└${bottom}┘` + " ".repeat(GAP);
      line4 += ` ${stubs} ` + " ".repeat(GAP);
      line5 += ` ${labels} ` + " ".repeat(GAP);
    }

    out.push(line0.padEnd(innerWidth + 1) + "│");
    out.push(line1.padEnd(innerWidth + 1) + "│");
    out.push(line2.padEnd(innerWidth + 1) + "│");
    out.push(line3.padEnd(innerWidth + 1) + "│");
    out.push(line4.padEnd(innerWidth + 1) + "│");
    out.push(line5.padEnd(innerWidth + 1) + "│");
    out.push(`│${" ".repeat(innerWidth)}│`);
  }

  // Harness list
  if (harnesses.length > 0) {
    out.push(`│  Harnesses:${" ".repeat(innerWidth - 12)}│`);

    for (let i = 0; i < harnesses.length; i++) {
      const h = harnesses[i];
      const letter = String.fromCharCode(65 + i);
      const topo = `[${h.topology}]`.padEnd(7);

      const epDescs = h.endpoints.map((ep) => {
        let desc = ep.childModuleId ?? mod.id;
        if (ep.interfaceId) {
          const shortIface = ep.interfaceId.length > 8 ? ep.interfaceId.slice(0, 8) : ep.interfaceId;
          desc += `.${shortIface}`;
        }
        if (ep.profileInstanceId) {
          const shortProf = ep.profileInstanceId.length > 6 ? ep.profileInstanceId.slice(0, 6) : ep.profileInstanceId;
          desc += `.${shortProf}`;
        }
        return desc;
      });

      const shortName = (h.name ?? h.id).slice(0, 14).padEnd(14);
      const path = epDescs.join(" ── ");
      const harnessLine = `   ${letter} ${topo} ${shortName}  ${path}`;
      out.push(`│${harnessLine.padEnd(innerWidth)}│`);
    }
  }

  out.push(`│${" ".repeat(innerWidth)}│`);
  out.push(`└${"─".repeat(innerWidth)}┘`);

  return out.join("\n");
}

export function renderAscii(
  rootModule: ModuleDef,
  childDefs: Record<string, ModuleDef>,
): string {
  const out: string[] = [];

  // System view
  out.push(renderSystemAscii(rootModule, childDefs));
  out.push("");
  out.push("");

  // Pair views for each harness
  const harnesses = rootModule.harnesses ?? [];
  for (let i = 0; i < harnesses.length; i++) {
    const h = harnesses[i];
    const letter = String.fromCharCode(65 + i);
    const header = `═══ ${letter}: ${h.name ?? h.id} [${h.topology}] `;
    out.push(header + "═".repeat(Math.max(0, 60 - header.length)));
    out.push("");
    out.push(renderPairAscii(h, rootModule, childDefs));
    out.push("");
    out.push("");
  }

  return out.join("\n");
}
