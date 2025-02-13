/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Wrapper around the statvar menu. We only want the user to choose two statvars.
 * Pops up a modal if three statvars are selected and forces the user to choose
 * two of the three.
 */

import React, { useContext, useEffect, useState } from "react";
import _ from "lodash";
import axios from "axios";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Container,
  FormGroup,
  Label,
  Input,
} from "reactstrap";
import { StatVarInfo, getStatVarInfo } from "../../shared/stat_var";
import { Context, EmptyAxis, Axis, AxisWrapper } from "./context";
import { StatVarHierarchyType } from "../../shared/types";
import { StatVarHierarchy } from "../../stat_var_hierarchy/stat_var_hierarchy";

// Number of enclosed places to sample when filtering the stat vars in the
// stat var menu
const SAMPLE_SIZE = 3;

interface StatVar {
  // Always contains a single statvar.
  info: StatVarInfo;
  dcid: string;
}

const emptyStatVar: StatVar = Object.freeze({
  info: {},
  dcid: "",
});

interface ModalSelected {
  x: boolean;
  y: boolean;
}

const defaultModalSelected: ModalSelected = Object.freeze({
  x: true,
  y: false,
});

function StatVarChooser(): JSX.Element {
  const { x, y, place } = useContext(Context);

  // Temporary variable for storing an extra statvar.
  const [thirdStatVar, setThirdStatVar] = useState(emptyStatVar);
  // Records which two of the three statvars are wanted if a third statvar is selected.
  const [modalSelected, setModalSelected] = useState(defaultModalSelected);
  const [modalOpen, setModalOpen] = useState(false);
  const [samplePlaces, setSamplePlaces] = useState(
    _.sampleSize(place.value.enclosedPlaces, SAMPLE_SIZE)
  );
  useEffect(() => {
    setSamplePlaces(_.sampleSize(place.value.enclosedPlaces, SAMPLE_SIZE));
  }, [place.value.enclosedPlaces]);
  const menuSelected = [
    x.value.statVarDcid,
    y.value.statVarDcid,
    thirdStatVar.dcid,
  ].filter((sv) => !_.isEmpty(sv));
  const closeModal = () => {
    setThirdStatVar(emptyStatVar);
    setModalOpen(false);
  };

  useEffect(() => {
    const statVarsToGetInfo = [];
    if (!_.isEmpty(x.value.statVarDcid) && _.isNull(x.value.statVarInfo)) {
      statVarsToGetInfo.push(x.value.statVarDcid);
    }
    if (!_.isEmpty(y.value.statVarDcid) && _.isNull(y.value.statVarInfo)) {
      statVarsToGetInfo.push(y.value.statVarDcid);
    }
    if (_.isEmpty(statVarsToGetInfo)) {
      return;
    }
    getStatVarInfo(statVarsToGetInfo)
      .then((info) => {
        if (x.value.statVarDcid in info) {
          x.setStatVarInfo(info[x.value.statVarDcid]);
        }
        if (y.value.statVarDcid in info) {
          y.setStatVarInfo(info[y.value.statVarDcid]);
        }
      })
      .catch(() => {
        if (statVarsToGetInfo.indexOf(x.value.statVarDcid) > -1) {
          x.setStatVarInfo({});
        }
        if (statVarsToGetInfo.indexOf(y.value.statVarDcid) > -1) {
          y.setStatVarInfo({});
        }
      });
  }, [x.value.statVarDcid, y.value.statVarDcid]);

  useEffect(() => {
    if (!_.isEmpty(samplePlaces) && !_.isEmpty(menuSelected)) {
      axios
        .post("/api/place/stat-vars/union", {
          dcids: samplePlaces.map((place) => place.dcid),
          statVars: menuSelected,
        })
        .then((resp) => {
          const availableSVs = resp.data;
          const unavailableSVs = [];
          if (
            x.value.statVarDcid &&
            availableSVs.indexOf(x.value.statVarDcid) === -1
          ) {
            let name = x.value.statVarDcid;
            if (x.value.statVarInfo) {
              name = x.value.statVarInfo.title || x.value.statVarDcid;
            }
            unavailableSVs.push(name);
            x.unsetStatVarDcid();
          }
          if (
            y.value.statVarDcid &&
            availableSVs.indexOf(y.value.statVarDcid) === -1
          ) {
            let name = y.value.statVarDcid;
            if (y.value.statVarInfo) {
              name = y.value.statVarInfo.title || y.value.statVarDcid;
            }
            unavailableSVs.push(name);
            y.unsetStatVarDcid();
          }
          if (!_.isEmpty(unavailableSVs)) {
            alert(
              `Sorry, the selected variable(s) [${unavailableSVs.join(
                ", "
              )}] ` + "are not available for the chosen place."
            );
          }
        });
    }
  }, [samplePlaces]);
  let yTitle = y.value.statVarDcid;
  if (y.value.statVarInfo && y.value.statVarInfo.title) {
    yTitle = y.value.statVarInfo.title;
  }
  let xTitle = x.value.statVarDcid;
  if (x.value.statVarInfo && x.value.statVarInfo.title) {
    xTitle = x.value.statVarInfo.title;
  }
  return (
    <div className="explore-menu-container" id="explore">
      <StatVarHierarchy
        type={StatVarHierarchyType.SCATTER}
        places={samplePlaces}
        selectedSVs={menuSelected}
        selectSV={(sv) => addStatVar(x, y, sv, setThirdStatVar, setModalOpen)}
        deselectSV={(sv) => removeStatVar(x, y, sv)}
        searchLabel="Statistical Variables"
      ></StatVarHierarchy>
      <Modal isOpen={modalOpen} backdrop="static" id="statvar-modal">
        <ModalHeader toggle={closeModal}>
          Only Two Statistical Variables Supported
        </ModalHeader>
        <ModalBody>
          <Container>
            <div>
              You selected:{" "}
              <b>{thirdStatVar.info.title || thirdStatVar.dcid}</b>
            </div>
            <div className="radio-selection-label">
              Please choose 1 more statistical variable to keep:
            </div>
            <div className="radio-selection-section">
              <FormGroup radio row>
                <Label radio>
                  <Input
                    id="x-radio-button"
                    type="radio"
                    name="statvar"
                    defaultChecked={modalSelected.x}
                    onClick={() => setModalSelected({ x: true, y: false })}
                  />
                  {xTitle}
                </Label>
              </FormGroup>
              <FormGroup radio row>
                <Label radio>
                  <Input
                    id="y-radio-button"
                    type="radio"
                    name="statvar"
                    defaultChecked={modalSelected.y}
                    onClick={() => setModalSelected({ x: false, y: true })}
                  />
                  {yTitle}
                </Label>
              </FormGroup>
            </div>
          </Container>
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={() =>
              confirmStatVars(
                x,
                y,
                thirdStatVar,
                setThirdStatVar,
                modalSelected,
                setModalSelected,
                setModalOpen
              )
            }
          >
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

/**
 * Adds a statvar.
 * If either x or y axis does not yet have a statvar selected, assign the new
 * statvar to that axis. Otherwise, set the new statvar as the third, extra statvar.
 * @param x
 * @param y
 * @param statVar
 * @param nodePath
 * @param denominators
 * @param setThirdStatVar
 */
function addStatVar(
  x: AxisWrapper,
  y: AxisWrapper,
  svDcid: string,
  setThirdStatVar: (statVar: StatVar) => void,
  setModalOpen: (open: boolean) => void
) {
  getStatVarInfo([svDcid])
    .then((info) => {
      const svInfo = info[svDcid] ? info[svDcid] : {};
      addStatVarHelper(x, y, svInfo, svDcid, setThirdStatVar, setModalOpen);
    })
    .catch(() => {
      addStatVarHelper(x, y, {}, svDcid, setThirdStatVar, setModalOpen);
    });
}

/** Helper function to update the right axis with the new selected stat var.
 * If either x or y axis does not yet have a statvar selected, assign the new
 * statvar to that axis. Otherwise, set the new statvar as the third, extra
 * statvar.
 */
function addStatVarHelper(
  x: AxisWrapper,
  y: AxisWrapper,
  svInfo: StatVarInfo,
  svDcid: string,
  setThirdStatVar: (statVar: StatVar) => void,
  setModalOpen: (open: boolean) => void
): void {
  if (_.isEmpty(x.value.statVarDcid)) {
    x.set({
      statVarInfo: svInfo,
      statVarDcid: svDcid,
      log: x.value.log,
      perCapita: x.value.perCapita,
    });
  } else if (_.isEmpty(y.value.statVarDcid)) {
    y.set({
      statVarInfo: svInfo,
      statVarDcid: svDcid,
      log: y.value.log,
      perCapita: y.value.perCapita,
    });
  } else {
    setThirdStatVar({ info: svInfo, dcid: svDcid });
    setModalOpen(true);
  }
}

/**
 * Removes a selected statvar.
 * @param x
 * @param y
 * @param statVar
 * @param nodePath
 */
function removeStatVar(x: AxisWrapper, y: AxisWrapper, svDcid: string) {
  const statVarX = x.value.statVarDcid;
  const statVarY = y.value.statVarDcid;
  if (statVarX === svDcid) {
    x.unsetStatVarDcid();
  } else if (statVarY === svDcid) {
    y.unsetStatVarDcid();
  }
}

/**
 * Confirms the statvar selections in the modal.
 * No-op if all three statvars are selected.
 * Clears the third, extra statvar and the modal selections.
 * @param x
 * @param y
 * @param thirdStatVar
 * @param setThirdStatVar
 * @param modalSelected
 * @param setModalSelected
 */
function confirmStatVars(
  x: AxisWrapper,
  y: AxisWrapper,
  thirdStatVar: StatVar,
  setThirdStatVar: (statVar: StatVar) => void,
  modalSelected: ModalSelected,
  setModalSelected: (modalSelected: ModalSelected) => void,
  setModalOpened: (open: boolean) => void
): void {
  const values: Array<Axis> = [];
  const axes = [x, y];
  if (modalSelected.x) {
    values.push(x.value);
  } else {
    assignAxes([x], [EmptyAxis]);
  }
  if (modalSelected.y) {
    values.push(y.value);
  } else {
    assignAxes([y], [EmptyAxis]);
  }
  values.push({
    ...EmptyAxis,
    statVarInfo: thirdStatVar.info,
    statVarDcid: thirdStatVar.dcid,
  });
  assignAxes(axes, values);
  assignAxes(axes, values);
  setThirdStatVar(emptyStatVar);
  setModalSelected(defaultModalSelected);
  setModalOpened(false);
}

/**
 * Assigns the first `Axis` in `values` to the first `AxisWrapper` in axes while
 * keeping the log and per capita options in the original `AxisWrapper`.
 * The `Axis` and `AxisWrapper` involved are removed from the arrays.
 * @param axes
 * @param values
 */
function assignAxes(axes: Array<AxisWrapper>, values: Array<Axis>) {
  const axis = axes.shift();
  axis.set({
    ...values.shift(),
    log: axis.value.log,
    perCapita: axis.value.perCapita,
  });
}

export { StatVarChooser };
