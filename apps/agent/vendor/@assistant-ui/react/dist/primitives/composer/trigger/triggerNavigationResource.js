import { useEffect, useEffectEvent, useMemo, useState } from "@assistant-ui/tap/react-shim";
import { resource } from "@assistant-ui/tap";
//#region src/primitives/composer/trigger/triggerNavigationResource.ts
function matchesQuery(item, lower) {
	return item.id.toLowerCase().includes(lower) || item.label.toLowerCase().includes(lower) || (item.description?.toLowerCase().includes(lower) ?? false);
}
/**
* Computes categories, items, search results, and navigation state from the
* adapter + current query. Pure derivation — no side effects on the composer.
*/
const useTriggerNavigationResource = ({ adapter, query, open }) => {
	const [activeCategoryId, setActiveCategoryId] = useState(null);
	useEffect(() => {
		if (!open) setActiveCategoryId(null);
	}, [open]);
	const categories = useMemo(() => {
		if (!open || !adapter) return [];
		return adapter.categories();
	}, [open, adapter]);
	const effectiveActiveCategoryId = open ? activeCategoryId : null;
	const allItems = useMemo(() => {
		if (!effectiveActiveCategoryId || !adapter) return [];
		return adapter.categoryItems(effectiveActiveCategoryId);
	}, [effectiveActiveCategoryId, adapter]);
	const searchResults = useMemo(() => {
		if (!open || !adapter || effectiveActiveCategoryId) return null;
		if (!query && categories.length > 0) return null;
		if (adapter.search) return adapter.search(query);
		const all = [];
		const lower = query.toLowerCase();
		for (const cat of categories) for (const item of adapter.categoryItems(cat.id)) if (matchesQuery(item, lower)) all.push(item);
		return all;
	}, [
		open,
		adapter,
		query,
		effectiveActiveCategoryId,
		categories
	]);
	const isSearchMode = searchResults !== null;
	const filteredCategories = useMemo(() => {
		if (isSearchMode) return [];
		if (!query) return categories;
		const lower = query.toLowerCase();
		return categories.filter((cat) => cat.label.toLowerCase().includes(lower));
	}, [
		categories,
		query,
		isSearchMode
	]);
	const filteredItems = useMemo(() => {
		if (isSearchMode) return searchResults ?? [];
		if (!query) return allItems;
		const lower = query.toLowerCase();
		return allItems.filter((item) => matchesQuery(item, lower));
	}, [
		allItems,
		query,
		isSearchMode,
		searchResults
	]);
	return {
		categories: filteredCategories,
		items: filteredItems,
		isSearchMode,
		activeCategoryId: effectiveActiveCategoryId,
		navigableList: useMemo(() => {
			if (isSearchMode) return searchResults ?? [];
			if (effectiveActiveCategoryId) return filteredItems;
			return filteredCategories;
		}, [
			isSearchMode,
			searchResults,
			effectiveActiveCategoryId,
			filteredItems,
			filteredCategories
		]),
		selectCategory: useEffectEvent((categoryId) => {
			setActiveCategoryId(categoryId);
		}),
		goBack: useEffectEvent(() => {
			setActiveCategoryId(null);
		})
	};
};
const TriggerNavigationResource = resource(useTriggerNavigationResource);
//#endregion
export { TriggerNavigationResource };

//# sourceMappingURL=triggerNavigationResource.js.map