import formOptions from './form_options.json';
import {
  MacroCategory,
  Category,
  DsaCategory,
  FrontendCategory,
  SystemDesignCategory,
  Difficulty,
} from '@app/types/problem';

export type CategoryOption<T extends string> = { value: T; label: string };
export type MacroCategoryOption = { value: MacroCategory; label: string; description: string };

export type FormOptionsJSON = {
  macroCategories: MacroCategoryOption[];
  dsaCategories: CategoryOption<DsaCategory>[];
  frontendCategories: CategoryOption<FrontendCategory>[];
  systemDesignCategories: CategoryOption<SystemDesignCategory>[];
  difficulties: CategoryOption<Difficulty>[];
  frontendFrameworks: CategoryOption<string>[];
  stylingOptions: CategoryOption<string>[];
};

const formOptionsData = formOptions as FormOptionsJSON;

export const macroCategories = formOptionsData.macroCategories;
export const dsaCategories = formOptionsData.dsaCategories;
export const frontendCategories = formOptionsData.frontendCategories;
export const systemDesignCategories = formOptionsData.systemDesignCategories;
export const difficulties = formOptionsData.difficulties;
export const frontendFrameworks = formOptionsData.frontendFrameworks;
export const stylingOptions = formOptionsData.stylingOptions;

export const getDefaultCategoryForMacro = (macro: MacroCategory): Category => {
  switch (macro) {
    case 'dsa':
      return dsaCategories[0]?.value ?? 'bfs-dfs';
    case 'frontend':
      return frontendCategories[0]?.value ?? 'react-components';
    case 'system-design':
      return systemDesignCategories[0]?.value ?? 'scalability';
    default:
      return 'bfs-dfs';
  }
};
