export const BODY_COLOURS = {
  lime: { name: "Lime", top: "#E4FF5C", left: "#21E065", right: "#12B552" },
  mint: { name: "Mint", top: "#D6FFE4", left: "#8EF0B2", right: "#55CF86" },
  sun: { name: "Sun", top: "#FFE98A", left: "#FFD21F", right: "#D9A200" },
  coral: { name: "Coral", top: "#FFC2AD", left: "#FF8A66", right: "#DB6440" },
  sky: { name: "Sky", top: "#D3F6FF", left: "#7FD6F2", right: "#48AFD1" },
  plum: { name: "Plum", top: "#E7D2FF", left: "#B98AF0", right: "#9363CC" },
} as const;
export const TOPPERS = { sprout: "Sprout", antenna: "Antenna", cap: "Cap", crown: "Crown" } as const;

export type Avatar = { body: keyof typeof BODY_COLOURS; topper: keyof typeof TOPPERS };
export const DEFAULT_AVATAR: Avatar = { body: "lime", topper: "sprout" };
