import {
  Canvas,
  ActiveSelection,
  Transform,
  util,
  FabricObject,
} from "fabric";

import { setEditableObjectProperties } from "./util";

type ModificationType =
  | "addObject"
  | "removeObject"
  | "modifyObject";

type HistoryAction = {
  type: ModificationType;

  // TODO do this better

  /** The ID of the object this refers to. Used for addObject and modifyObject. */
  objectID?: string;

  // Used for group selection and deletion
  objectIDs?: Array<string>;

  /** Copy of the newly delete object. Used for removeObject. */
  objectDeepCopy?: string;

  /** Copy of the properties it used to have before the modification. Used for modifyObject */
  previousProperties?: any;
};

type BeforeTransformProperties = {
  cropX?: number;
  cropY?: number;
};

const PROPERTIES_TO_INCLUDE = [
  "id",
  "selectable",
  "hasControls",
  "hoverCursor",
  "transparentCorners",
];
class FabricHistory {
  private historyUndo: Array<HistoryAction> = [];
  private historyRedo: Array<HistoryAction> = [];
  private historyProcessing = false;
  private canvas: Canvas;
  private beforeTransformProperties: BeforeTransformProperties = {};
  private canvasEventHandlers;
  constructor(canvas: Canvas) {
    this.canvas = canvas;
    this.canvasEventHandlers = {
      "object:added": this.onObjectAdded.bind(this),
      "object:removed": this.onObjectRemoved.bind(this),
      "object:modified": this.onObjectModified.bind(this),
      "before:transform": this.onBeforeTransform.bind(this),
    };
    this.canvas.on(this.canvasEventHandlers);
  }

  clearHistory() {
    this.historyUndo = [];
    this.historyRedo = [];
  }

  removeListeners() {
    this.canvas.off(this.canvasEventHandlers);
    this.historyUndo = [];
    this.historyRedo = [];
  }

  private historyCacheProperties({ e, transform }) {
    this.beforeTransformProperties.cropX = transform.target.cropX;
    this.beforeTransformProperties.cropY = transform.target.cropY;
  }

  private onMyHistoryEvent(type: ModificationType, objectEvent: any) {
    const target = objectEvent.target as FabricObject;
    if (this.historyProcessing || target.excludeFromExport) {
      return;
    }
    this.historyRedo = [];
    const action = this.getHistoryAction(objectEvent, type);
    this.historyUndo.push(action);
  }

  private onObjectAdded(e: any) {
    this.onMyHistoryEvent('addObject', e);
  }

  private onObjectRemoved(e: any) {
    this.onMyHistoryEvent('removeObject', e);
  }

  private onObjectModified(e: any) {
    this.onMyHistoryEvent('modifyObject', e);
  }

  private onBeforeTransform(e: any) {
    this.historyCacheProperties(e)
  }

  private getHistoryAction(objectEvent: any, type: ModificationType): HistoryAction {
    const target = objectEvent.target as FabricObject;
    switch (type) {
      case "addObject":
        return this.historySaveAddObject(target);
      case "removeObject":
        return this.historySaveRemoveObject(target);
      case "modifyObject":
        return this.historySaveModifyObject(target, objectEvent.transform as Transform);
    }
  }

  private historySaveAddObject(target: FabricObject): HistoryAction {
    return {
      type: "addObject",
      objectID: target.id,
    };
  }

  private historySaveRemoveObject(target: FabricObject): HistoryAction {
    return {
      type: "removeObject",
      objectDeepCopy: JSON.stringify(target.toObject(PROPERTIES_TO_INCLUDE)),
    };
  }

  public addManualObjectModifiedEvent(target: FabricObject, previousValues: Object) {
    if (this.historyProcessing || target.excludeFromExport) {
      return;
    }
    this.historyRedo = [];
    const action = this.getManualObjectModifiedEvent(target, previousValues);
    this.historyUndo.push(action);
  }

  private getManualObjectModifiedEvent(target: any, previousValues: Object): HistoryAction {
    if (!target.id && target.getObjects) {
      // We have a selection
      const ids = target.getObjects().map((o: any) => {
        return o.id;
      });
      return {
        type: "modifyObject",
        objectIDs: ids,
        previousProperties: {
          ...previousValues
        },
      };
    }

    return {
      type: "modifyObject",
      objectID: target.id,
      previousProperties: {
          ...previousValues
      },
    };
  }

  private historySaveModifyObject(target: any, transform: Transform): HistoryAction {
    if (!target.id && target.getObjects) {
      // We have a selection
      const ids = target.getObjects().map((o: any) => {
        return o.id;
      });
      return {
        type: "modifyObject",
        objectIDs: ids,
        previousProperties: {
          ...transform.original,
          width: transform.width,
          cropX: this.beforeTransformProperties.cropX,
          cropY: this.beforeTransformProperties.cropY,
          height: transform.height,
        },
      };
    }

    return {
      type: "modifyObject",
      objectID: target.id,
      previousProperties: {
        ...transform.original,
        cropX: this.beforeTransformProperties.cropX,
        cropY: this.beforeTransformProperties.cropY,
        width: transform.width,
        height: transform.height,
      },
    };
  }

  async undo() {
    if (this.historyUndo.length === 0) {
      return;
    }
    const actionToUndo = this.historyUndo.pop();

    this.historyProcessing = true;

    switch (actionToUndo.type) {
      case "addObject":
        this.undoAddObject(actionToUndo);
        break;
      case "removeObject":
        await this.undoRemoveObject(actionToUndo);
        break;
      case "modifyObject": {
        this.undoModifyObject(actionToUndo);
        break;
      }
    }
    this.historyProcessing = false;
    this.canvas.requestRenderAll();
  }

  private undoAddObject(actionToUndo: HistoryAction) {
    // undo add object -> remove
    if (!actionToUndo.objectID) {
      console.error("could not undo action", actionToUndo);
      return;
    }
    const found = this.canvas.getObjects().find((o) => {
      return o.id === actionToUndo.objectID;
    });
    this.historyRedo.push({
      type: "addObject",
      objectDeepCopy: JSON.stringify(found.toObject(PROPERTIES_TO_INCLUDE)),
    });
    this.canvas.remove(found);
  }

  private async undoRemoveObject(actionToUndo: HistoryAction) {
    // undo remove object -> add
    if (!actionToUndo.objectDeepCopy) {
      console.error("could not undo action", actionToUndo);
      return;
    }
    const [object] = await util.enlivenObjects([
      JSON.parse(actionToUndo.objectDeepCopy),
    ]);
    const restoredObject = object as FabricObject;

    this.historyRedo.push({
      type: "removeObject",
      objectID: restoredObject.id,
    });
    setEditableObjectProperties(restoredObject);
    this.canvas.add(restoredObject);
  }

  private getModifiedObject(actionToUndo: HistoryAction) {
    if (actionToUndo.objectIDs) {
      const objects = this.canvas.getObjects().filter((o) => {
        return actionToUndo.objectIDs.includes(o.id);
      });
      const found = new ActiveSelection(objects);
      this.canvas.setActiveObject(found);
      return found;
    } else {
      const found = this.canvas.getObjects().find((o) => {
        return o.id === actionToUndo.objectID;
      });
      return found;
    }
  }

  private createCurrentPropertiesObject(
    object: FabricObject,
    actionToUndo: HistoryAction
  ) {
    const currentProperties: any = {};
    for (const entry of Object.entries(actionToUndo.previousProperties)) {
      const [key] = entry;
      currentProperties[key] = object.get(key);
    }
    return currentProperties;
  }

  private applyPreviousProperties(
    object: FabricObject,
    previousProperties: any
  ) {
    for (const entry of Object.entries(previousProperties)) {
      const [key, value] = entry;
      // TODO: WHOO HACK OMG
      if (key != "originX" && key != "originY") {
        object.set(key, value);
      }
    }
    object.setCoords();
  }

  private undoModifyObject(actionToUndo: HistoryAction) {
    if (
      (!actionToUndo.objectID && !actionToUndo.objectIDs) ||
      !actionToUndo.previousProperties
    ) {
      console.error("could not undo action", actionToUndo);
      return;
    }

    // Get the modified object or modified selection of objects
    const found = this.getModifiedObject(actionToUndo);

    const currentProperties = this.createCurrentPropertiesObject(
      found,
      actionToUndo
    );
    this.historyRedo.push({
      type: "modifyObject",
      objectID: actionToUndo.objectID,
      objectIDs: actionToUndo.objectIDs,
      previousProperties: currentProperties,
    });
    this.applyPreviousProperties(found, actionToUndo.previousProperties);
  }

  async redo() {
    if (this.historyRedo.length === 0) {
      return;
    }

    const actionToRedo = this.historyRedo.pop();

    // And then redo that last action
    this.historyProcessing = true;
    switch (actionToRedo.type) {
      case "addObject":
        await this.redoAddObject(actionToRedo);
        break;
      case "removeObject": {
        this.redoRemoveObject(actionToRedo);
        break;
      }
      case "modifyObject": {
        if (
          (!actionToRedo.objectID && !actionToRedo.objectIDs) ||
          !actionToRedo.previousProperties
        ) {
          console.error("could not redo action", actionToRedo);
          return;
        }
        // Get the modified object or modified selection of objects
        const found = this.getModifiedObject(actionToRedo);

        const currentProperties = this.createCurrentPropertiesObject(
          found,
          actionToRedo
        );
        this.historyUndo.push({
          type: "modifyObject",
          objectIDs: actionToRedo.objectIDs,
          objectID: actionToRedo.objectID,
          previousProperties: currentProperties,
        });
        this.applyPreviousProperties(found, actionToRedo.previousProperties)
        break;
      }
    }

    this.canvas.requestRenderAll();
    this.historyProcessing = false;
  }

  private async redoAddObject(actionToRedo: HistoryAction) {
    // redo add object -> add
    if (!actionToRedo.objectDeepCopy) {
      console.error("could not redo action", actionToRedo);
      return;
    }
    const [object] = await util.enlivenObjects([
      JSON.parse(actionToRedo.objectDeepCopy),
    ]);
    const restoredObject = object as FabricObject;

    this.historyUndo.push({
      type: "addObject",
      objectID: restoredObject.id,
    });
    setEditableObjectProperties(restoredObject);
    this.canvas.add(restoredObject);
  }

  private redoRemoveObject(actionToRedo: HistoryAction) {
    // redo remove object -> remove
    if (!actionToRedo.objectID) {
      console.error("could not redo action", actionToRedo);
      return;
    }
    const found = this.canvas.getObjects().find((o) => {
      return o.id === actionToRedo.objectID;
    });
    this.historyUndo.push({
      type: "removeObject",
      objectDeepCopy: JSON.stringify(found.toObject(PROPERTIES_TO_INCLUDE)),
    });
    this.canvas.remove(found);
  }
}

export default FabricHistory;
