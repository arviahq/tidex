import { useQuery } from "@tanstack/react-query";
import {
  fetchBindings,
  fetchConfigSnapshot,
  fetchManifest,
  fetchProps,
  fetchScanReport,
  fetchTokens,
} from "./api";

export function useTidexData() {
  const manifest = useQuery({ queryKey: ["manifest"], queryFn: fetchManifest });
  const props = useQuery({ queryKey: ["props"], queryFn: fetchProps });
  const tokens = useQuery({ queryKey: ["tokens"], queryFn: fetchTokens });
  const config = useQuery({ queryKey: ["config"], queryFn: fetchConfigSnapshot });
  const scanReport = useQuery({ queryKey: ["scan-report"], queryFn: fetchScanReport });
  const bindings = useQuery({ queryKey: ["bindings"], queryFn: fetchBindings });
  return { manifest, props, tokens, config, scanReport, bindings };
}
