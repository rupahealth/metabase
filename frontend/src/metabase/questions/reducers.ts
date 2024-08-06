import type { AnyAction } from "redux";

import type { Parameter } from "metabase-types/api";

interface QuestionsState {
  dynamicParameters: {
    [key: string]: Parameter[];
  };
}

const initialState: QuestionsState = {
  dynamicParameters: {},
};

export const questionsReducer = (
  state = initialState,
  action: AnyAction,
): QuestionsState => {
  switch (action.type) {
    case "UPDATE_DYNAMIC_PARAMETERS":
      return {
        ...state,
        dynamicParameters: {
          ...state.dynamicParameters,
          [action.questionId]: action.parameters,
        },
      };
    case "SET_DYNAMIC_PARAMETERS":
      return {
        ...state,
        dynamicParameters: {
          ...state.dynamicParameters,
          [action.questionId]: action.parameters,
        },
      };
    default:
      return state;
  }
};
