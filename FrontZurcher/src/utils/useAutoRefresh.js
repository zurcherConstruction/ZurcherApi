import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";

/**
 * useAutoRefresh - Polls a Redux action at a given interval.
 * @param {Function} action - Redux action creator (no args).
 * @param {number} interval - Polling interval in ms (default: 60000).
 * @param {Array} deps - Dependency array for useEffect (default: []).
 * @returns {Object} { forceRefresh } - Manual refresh function.
 */
const useAutoRefresh = (action, interval = 60000, deps = []) => {
  const dispatch = useDispatch();
  const intervalRef = useRef(null);

  useEffect(() => {
    // Initial fetch
    dispatch(action());
    // Start polling
    intervalRef.current = setInterval(() => {
      dispatch(action());
    }, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line
  }, deps);

  const forceRefresh = () => dispatch(action());
  return { forceRefresh };
};

export default useAutoRefresh;
