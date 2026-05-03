export type DomainKind =
  | "electrical"
  | "mechanical"
  | "pneumatic"
  | "hydraulic"
  | "thermal"
  | "software"
  | "network";

export interface PowerDomainDef {
  id: string;
  name?: string;
  nominal_voltage_V?: number;
  voltage_range_V?: [number, number];
  max_current_mA?: number;
  regulation_type?: "regulated" | "unregulated";
}

export interface DomainMetadata {
  domain: DomainKind;
  power_domains?: PowerDomainDef[];
  // Mechanical
  dimensions_mm?: { length?: number; width?: number; height?: number };
  weight_g?: number;
  // Thermal
  operating_temperature_C?: [number, number];
  // Extensible
  metadata?: Record<string, unknown>;
}
