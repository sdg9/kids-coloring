export enum BrushType {
    CRAYON = 'crayon',
    MARKER = 'marker',
    PENCIL = 'pencil',
}

export interface BrushConfig {
    type: BrushType;
    label: string;
    radius: number;
    alpha: number;
    spacing: number;
    jitter: number;
    textureVariants: number;
}

export const BRUSH_CONFIGS: Record<BrushType, BrushConfig> = {
    [BrushType.CRAYON]: {
        type: BrushType.CRAYON,
        label: 'Crayon',
        radius: 16,
        alpha: 0.7,
        spacing: 0.3,
        jitter: 2,
        textureVariants: 4,
    },
    [BrushType.MARKER]: {
        type: BrushType.MARKER,
        label: 'Marker',
        radius: 14,
        alpha: 0.5,
        spacing: 0.25,
        jitter: 0,
        textureVariants: 1,
    },
    [BrushType.PENCIL]: {
        type: BrushType.PENCIL,
        label: 'Pencil',
        radius: 4,
        alpha: 0.35,
        spacing: 0.4,
        jitter: 1.5,
        textureVariants: 3,
    },
};
