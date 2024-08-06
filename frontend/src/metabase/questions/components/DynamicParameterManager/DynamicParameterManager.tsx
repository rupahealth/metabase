import PropTypes from "prop-types";
import { useEffect } from "react";

import { useDispatch } from "metabase/lib/redux";
import { setDynamicParameters } from "metabase/questions/actions";
// import { getDynamicParameters } from "metabase/questions/selectors";
import type { Question } from "metabase-types/api";
// import type { RootState } from "metabase-types/store";

interface DynamicParameterManagerProps {
  question: Question;
}

export const DynamicParameterManager: React.FC<
  DynamicParameterManagerProps
> = ({ question }) => {
  const dispatch = useDispatch();
  // const dynamicParameters = useSelector((state: RootState) => getDynamicParameters(state, question.id));

  useEffect(() => {
    if (question.parameters) {
      dispatch(setDynamicParameters(question.id, question.parameters));
    }
  }, [question.parameters, question.id, dispatch]);

  return null;
};

DynamicParameterManager.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    parameters: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        value: PropTypes.string,
      }),
    ).isRequired,
  }).isRequired,
};
