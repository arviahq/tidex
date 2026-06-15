import type { ComponentEntry, PropsMap } from "@tide/core";
import { getComponentId } from "@tide/core";

export interface ScanDiagnostics {
  warnings: string[];
  duplicateNames: Array<{ name: string; ids: string[]; paths: string[] }>;
  filesWithNoComponents: string[];
  componentsWithNoProps: string[];
  componentsWithUnknownProps: Array<{ id: string; name: string; unknownCount: number }>;
}

export function buildScanDiagnostics(
  scannedFiles: string[],
  components: ComponentEntry[],
  props: PropsMap,
): ScanDiagnostics {
  const warnings: string[] = [];
  const filesWithComponents = new Set(components.map((c) => c.path));
  const filesWithNoComponents = scannedFiles.filter((file) => !filesWithComponents.has(file));

  const byName = new Map<string, ComponentEntry[]>();
  for (const component of components) {
    const list = byName.get(component.name) ?? [];
    list.push(component);
    byName.set(component.name, list);
  }

  const duplicateNames = [...byName.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([name, entries]) => ({
      name,
      ids: entries.map((entry) => getComponentId(entry)),
      paths: entries.map((entry) => entry.path),
    }));

  if (duplicateNames.length > 0) {
    warnings.push(
      `${duplicateNames.length} component name(s) appear in multiple files — use distinct ids (now disambiguated by folder).`,
    );
  }

  const componentsWithNoProps: string[] = [];
  const componentsWithUnknownProps: Array<{ id: string; name: string; unknownCount: number }> = [];

  for (const component of components) {
    const id = getComponentId(component);
    const componentProps = props[id] ?? {};
    const keys = Object.keys(componentProps);
    if (keys.length === 0) {
      componentsWithNoProps.push(id);
      continue;
    }
    const unknownCount = keys.filter((key) => componentProps[key]?.type === "unknown").length;
    if (unknownCount > 0) {
      componentsWithUnknownProps.push({ id, name: component.name, unknownCount });
    }
  }

  if (componentsWithNoProps.length > 0) {
    warnings.push(
      `${componentsWithNoProps.length} component(s) have no controllable props — check export shape and co-locate prop types.`,
    );
  }

  if (componentsWithUnknownProps.length > 0) {
    warnings.push(
      `${componentsWithUnknownProps.length} component(s) have imported/unresolved prop types — move types into the component file or a local types module.`,
    );
  }

  if (filesWithNoComponents.length > 0) {
    warnings.push(`${filesWithNoComponents.length} scanned file(s) exported no JSX components.`);
  }

  return {
    warnings,
    duplicateNames,
    filesWithNoComponents,
    componentsWithNoProps,
    componentsWithUnknownProps,
  };
}

export function formatScanDiagnostics(diagnostics: ScanDiagnostics): string {
  const lines: string[] = [];
  for (const warning of diagnostics.warnings) {
    lines.push(`  ⚠ ${warning}`);
  }

  for (const dup of diagnostics.duplicateNames) {
    lines.push(`  Duplicate name "${dup.name}":`);
    for (let i = 0; i < dup.ids.length; i++) {
      lines.push(`    - ${dup.ids[i]} (${dup.paths[i]})`);
    }
  }

  if (diagnostics.componentsWithUnknownProps.length > 0) {
    lines.push("  Components with unresolved props:");
    for (const entry of diagnostics.componentsWithUnknownProps.slice(0, 20)) {
      lines.push(`    - ${entry.id}: ${entry.unknownCount} unknown`);
    }
    if (diagnostics.componentsWithUnknownProps.length > 20) {
      lines.push(`    … and ${diagnostics.componentsWithUnknownProps.length - 20} more`);
    }
  }

  return lines.join("\n");
}
