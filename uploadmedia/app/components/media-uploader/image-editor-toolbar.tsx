import {
  ArrowDownCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  ArrowUpCircle,
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Maximize,
  Move,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type ToolbarProps = {
  disabled: boolean;
  onAction: (action: string) => void;
};

const groups = [
  [
    ["move-mode", "Move", Move],
    ["crop-mode", "Crop", Crop],
    ["zoom-in", "Zoom in", ZoomIn],
    ["zoom-out", "Zoom out", ZoomOut],
    ["zoom-100", "Zoom to 100%", Maximize],
  ],
  [
    ["move-left", "Move left", ArrowLeftCircle],
    ["move-right", "Move right", ArrowRightCircle],
    ["move-up", "Move up", ArrowUpCircle],
    ["move-down", "Move down", ArrowDownCircle],
  ],
  [
    ["rotate-left", "Rotate left", RotateCcw],
    ["rotate-right", "Rotate right", RotateCw],
    ["flip-horizontal", "Flip horizontally", FlipHorizontal2],
    ["flip-vertical", "Flip vertically", FlipVertical2],
  ],
] as const;

export function ImageEditorToolbar({ disabled, onAction }: ToolbarProps) {
  return (
    <div className="editor-tool-groups">
      {groups.map((group) => (
        <div className="editor-button-group" key={group[0][0]}>
          {group.map(([action, label, Icon]) => (
            <button
              aria-label={label}
              disabled={disabled}
              key={action}
              onClick={() => onAction(action)}
              title={label}
              type="button"
            >
              <Icon aria-hidden="true" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
