
import {
  Control,
  controlsUtils,
  FabricObject,
} from "fabric";

import { v4 as uuidv4 } from "uuid";

export function setEditableObjectProperties(object: FabricObject) {
  // TODO: UGH hack
  if (!object.id) {
    object.id = uuidv4();
  }

  object.set({
    transparentCorners: false,
    selectable: true,
    snapAngle: 5,
    strokeWidth: 0,
  });
  object.controls.mt = new Control({
    x: 0,
    y: -0.5,
    cursorStyle: 'pointer',
    actionHandler: onCropFromTop,
    actionName: 'cropping',
    render: renderHorizontalCropIcon,
  });
  object.controls.mr = new Control({
    x: 0.5,
    y: 0,
    cursorStyle: 'pointer',
    actionHandler: onCropFromRight,
    actionName: 'cropping',
    render: renderVerticalCropIcon,
  });
  object.controls.ml = new Control({
    x: -0.5,
    y: 0,
    // offsetX: 100,
    cursorStyle: 'pointer',
    actionName: 'cropping',
    render: renderVerticalCropIcon,
    actionHandler: onCropFromLeft
  });
  object.controls.mb = new Control({
    x: 0,
    y: 0.5,
    // offsetX: 100,
    cursorStyle: 'pointer',
    actionName: 'cropping',
    render: renderHorizontalCropIcon,
    actionHandler: onCropFromBottom
  });
}

function renderHorizontalCropIcon(ctx, left, top, styleOverride, fabricObject) {
  ctx.save();
  ctx.translate(left, top);
  // ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
  // ctx.drawImage(deleteImg, -size / 2, -size / 2, size, size);
  const rectangleWidth = fabricObject.cornerSize * 2;
  ctx.fillRect(-rectangleWidth / 2, -rectangleWidth / 4, rectangleWidth , rectangleWidth / 2)
  ctx.restore();
}

function renderVerticalCropIcon(ctx, left, top, styleOverride, fabricObject) {
  ctx.save();
  ctx.translate(left, top);
  // ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
  // ctx.drawImage(deleteImg, -size / 2, -size / 2, size, size);
  const rectangleHeight = fabricObject.cornerSize * 2;
  ctx.fillRect(-rectangleHeight / 4, -rectangleHeight / 2, rectangleHeight /2, rectangleHeight);
  ctx.restore();
}

function onCropFromRight(eventData, transform, x, y) {
  const target = transform.target;
  const localPoint = controlsUtils.getLocalPoint(transform, transform.originX, transform.originY, x, y);
  const newWidth = localPoint.x / target.scaleX;
  const originalWidthWithCrop = target.getOriginalSize().width - (target.cropX || 0);
  if (newWidth > 0 && newWidth <= originalWidthWithCrop) {
    target.set('width', newWidth);
    return true;
  }
  return false;
}

function onCropFromLeft(eventData, transform, x, y) {
  const target = transform.target;
  const originalWidthWithCrop = target.getOriginalSize().width;

  const delta = x - target.left;
  const scaledWidth = target.getScaledWidth();
  const percentDecrease = delta / scaledWidth;

  const newWidth = target.width * (1 - percentDecrease);
  const cropDelta = target.width * percentDecrease; 
  const newCrop = target.cropX + cropDelta;
  
  if (newWidth > 0 && newWidth <= originalWidthWithCrop) {
    target.set('width', newWidth);
    target.set('cropX', Math.max(newCrop, 0));
    target.set('left', x);
    return true;
  }
  return false;
}

function onCropFromTop(eventData, transform, x, y) {
  const target = transform.target;
  const originalHeight = target.getOriginalSize().height;

  const delta = y - target.top;
  const scaledHeight = target.getScaledHeight();
  const percentDecrease = delta / scaledHeight;

  const newHeight = target.height * (1 - percentDecrease);
  const cropDelta = target.height * percentDecrease; 
  
  if (newHeight > 0 && newHeight <= originalHeight) {
    target.set('height', newHeight);
    target.set('cropY', Math.max(target.cropY + cropDelta, 0));
    target.set('top', y);
    return true;
  }
  return false;
}

function onCropFromBottom(eventData, transform, x, y) {
  const target = transform.target;
  const originalHeightWithCrop = target.getOriginalSize().height - target.cropY;

  const scaledHeight = target.getScaledHeight();
  const newScaledHeight = y - target.top;
  const percentOfFullHeight = newScaledHeight / scaledHeight;

  const newHeight = target.height * percentOfFullHeight;
  
  if (newHeight > 0 && newHeight <= originalHeightWithCrop) {
    target.set('height', newHeight);
    return true;
  }
  return false;
}
