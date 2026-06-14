import { useQuery } from "@tanstack/react-query";
import {
  fetchConfigSnapshot,
  fetchManifest,
  fetchProps,
  fetchScanReport,
  fetchTokens,
} from "./api";

export function useTideData() {
  const manifest = useQuery({ queryKey: ["manifest"], queryFn: fetchManifest });
  const props = useQuery({ queryKey: ["props"], queryFn: fetchProps });
  const tokens = useQuery({ queryKey: ["tokens"], queryFn: fetchTokens });
  const config = useQuery({ queryKey: ["config"], queryFn: fetchConfigSnapshot });
  const scanReport = useQuery({ queryKey: ["scan-report"], queryFn: fetchScanReport });
  return { manifest, props, tokens, config, scanReport };
}
