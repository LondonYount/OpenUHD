export type ArtifactType =
  | "pcb"
  | "schematic"
  | "3d_model"
  | "firmware"
  | "datasheet"
  | "simulation"
  | "documentation"
  | "cad"
  | "custom";

export interface ArtifactDef {
  id: string;
  name: string;
  type: ArtifactType;
  url?: string;
  filePath?: string;
  storageRef?: string;
  description?: string;
  mimeType?: string;
  tags?: string[];
}
