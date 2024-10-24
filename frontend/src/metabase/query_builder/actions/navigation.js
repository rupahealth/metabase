import { push, replace } from "react-router-redux";
import { createAction } from "redux-actions";
import { parse as parseUrl } from "url";

import { isEqualCard } from "metabase/lib/card";
import { createThunkAction } from "metabase/lib/redux";
import { equals } from "metabase/lib/utils";
import { getLocation } from "metabase/selectors/routing";
import * as Lib from "metabase-lib";
import { isAdHocModelQuestion } from "metabase-lib/v1/metadata/utils/models";

import {
  getCard,
  getDatasetEditorTab,
  getZoomedObjectId,
  getOriginalQuestion,
  getQueryBuilderMode,
  getQuestion,
} from "../selectors";
import { getQueryBuilderModeFromLocation } from "../typed-utils";
import {
  getCurrentQueryParams,
  getPathNameFromQueryBuilderMode,
  getURLForCardState,
} from "../utils";

import { initializeQB, setCardAndRun } from "./core";
import { zoomInRow, resetRowZoom } from "./object-detail";
import { cancelQuery } from "./querying";
import { resetUIControls, setQueryBuilderMode } from "./ui";

export const SET_CURRENT_STATE = "metabase/qb/SET_CURRENT_STATE";
const setCurrentState = createAction(SET_CURRENT_STATE);

export const POP_STATE = "metabase/qb/POP_STATE";
export const popState = createThunkAction(
  POP_STATE,
  location => async (dispatch, getState) => {
    dispatch(cancelQuery());

    const zoomedObjectId = getZoomedObjectId(getState());
    if (zoomedObjectId) {
      const { state, query } = getLocation(getState());
      const previouslyZoomedObjectId = state?.objectId || query?.objectId;

      if (
        previouslyZoomedObjectId &&
        zoomedObjectId !== previouslyZoomedObjectId
      ) {
        dispatch(zoomInRow({ objectId: previouslyZoomedObjectId }));
      } else {
        dispatch(resetRowZoom());
      }
      return;
    }

    const card = getCard(getState());
    if (location.state && location.state.card) {
      if (!equals(card, location.state.card)) {
        const shouldUpdateUrl = location.state.card.type === "model";
        const isEmptyQuery = !location.state.card.dataset_query.database;

        if (isEmptyQuery) {
          await dispatch(initializeQB(location, {}));
        } else {
          await dispatch(
            setCardAndRun(location.state.card, { shouldUpdateUrl }),
          );
          await dispatch(setCurrentState(location.state));
          await dispatch(resetUIControls());
        }
      }
    }

    // Captura o valor de display da URL e o aplica à questão
    const urlParams = new URLSearchParams(window.location.search);
    const displayFromURL = urlParams.get("display");
    if (displayFromURL) {
      const question = getQuestion(getState());
      question.setDisplay(displayFromURL); // Aplicamos o display da URL à questão

      question.updateVisualizationType(displayFromURL);

      dispatch(updateUrl(question, { replaceState: true })); // Garante que o tipo de visualização seja atualizado
    }
    const { queryBuilderMode: queryBuilderModeFromURL, ...uiControls } =
      getQueryBuilderModeFromLocation(location);

    if (getQueryBuilderMode(getState()) !== queryBuilderModeFromURL) {
      await dispatch(
        setQueryBuilderMode(queryBuilderModeFromURL, {
          ...uiControls,
          shouldUpdateUrl: queryBuilderModeFromURL === "dataset",
        }),
      );
    }
  },
);

const getURL = (location, { includeMode = false } = {}) =>
  // remove o modo queryBuilder do final da URL
  (includeMode
    ? location.pathname
    : location.pathname.replace(/\/(notebook|view)$/, "")) +
  location.search +
  location.hash;

// Lógica para lidar com alterações de localização
export const locationChanged =
  (location, nextLocation, nextParams) => dispatch => {
    if (location !== nextLocation) {
      if (nextLocation.action === "POP") {
        if (
          getURL(nextLocation, { includeMode: true }) !==
          getURL(location, { includeMode: true })
        ) {
          // o botão de avançar/voltar do navegador foi pressionado
          dispatch(popState(nextLocation));
        }
      } else if (
        (nextLocation.action === "PUSH" || nextLocation.action === "REPLACE") &&
        nextLocation.state === undefined // ignorar PUSH/REPLACE com `state` porque foram iniciados pela ação `updateUrl`
      ) {
        dispatch(initializeQB(nextLocation, nextParams));
      }
    }
  };

export const UPDATE_URL = "metabase/qb/UPDATE_URL";
export const updateUrl = createThunkAction(
  UPDATE_URL,
  (
      question,
      {
        dirty,
        replaceState,
        preserveParameters = true,
        queryBuilderMode,
        datasetEditorTab,
        objectId,
      } = {},
    ) =>
    (dispatch, getState) => {
      if (!question) {
        question = getQuestion(getState());
      }

      if (dirty == null) {
        const originalQuestion = getOriginalQuestion(getState());
        const isAdHocModel = isAdHocModelQuestion(question, originalQuestion);
        dirty =
          !originalQuestion ||
          (!isAdHocModel && question.isDirtyComparedTo(originalQuestion));
      }

      const { isNative } = Lib.queryDisplayInfo(question.query());

      if (!isNative && question.parameters().length > 0) {
        dirty = true;
      }

      if (!queryBuilderMode) {
        queryBuilderMode = getQueryBuilderMode(getState());
      }
      if (!datasetEditorTab) {
        datasetEditorTab = getDatasetEditorTab(getState());
      }

      // Capturar o valor de visualization_type da query e aplicar ao display
      const visualizationTypeParam = getCurrentQueryParams().visualization_type;
      const displayValue = visualizationTypeParam || "table"; // Se não houver visualization_type, usa 'table' como padrão

      const newCard = question._doNotCallSerializableCard();
      if (displayValue !== newCard.display) {
        newCard.display = displayValue;
      }

      const newState = {
        card: newCard,
        cardId: question.id(),
        objectId,
      };

      const { currentState } = getState().qb;
      const queryParams = { ...getCurrentQueryParams(), display: displayValue };

      const url = getURLForCardState(newState, dirty, queryParams, objectId);
      // console.log("Generated URL:", url);

      const urlParsed = parseUrl(url);
      const locationDescriptor = {
        pathname: getPathNameFromQueryBuilderMode({
          pathname: urlParsed.pathname || "",
          queryBuilderMode,
          datasetEditorTab,
        }),
        search: urlParsed.search,
        hash: urlParsed.hash,
        state: { ...newState, formNavigation: true },
      };

      const isSameURL =
        locationDescriptor.pathname === window.location.pathname &&
        (locationDescriptor.search || "") === (window.location.search || "") &&
        (locationDescriptor.hash || "") === (window.location.hash || "");
      const isSameCard =
        currentState && isEqualCard(currentState.card, newState.card);
      const isSameMode =
        getQueryBuilderModeFromLocation(locationDescriptor).mode ===
        getQueryBuilderModeFromLocation(window.location).mode;

      if (isSameCard && isSameURL) {
        return;
      }

      if (replaceState == null) {
        replaceState = isSameCard && isSameMode;
      }

      dispatch(setCurrentState(newState));

      try {
        if (replaceState) {
          // console.log("Final locationDescriptor:", locationDescriptor);
          dispatch(replace(locationDescriptor));
        } else {
          dispatch(push(locationDescriptor));
        }
      } catch (e) {
        console.warn(e);
      }
    },
);
