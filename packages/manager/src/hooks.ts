import { useQuery } from "@tanstack/react-query";
import { fetchManifest, fetchProps, fetchTokens } from "./api";

export function useTideData() {
  const manifest = useQuery({ queryKey: ["manifest"], queryFn: fetchManifest });
  const props = useQuery({ queryKey: ["props"], queryFn: fetchProps });
  const tokens = useQuery({ queryKey: ["tokens"], queryFn: fetchTokens });
  return { manifest, props, tokens };
}
