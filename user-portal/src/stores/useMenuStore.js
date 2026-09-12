import { create } from 'zustand';
import axios from 'axios';
import { config, API_BASE } from '../config';
import { useUIStore } from './useUIStore';
import {
  getCategoryName,
  getCategoryIconKey,
  getSuggestedIconKey,
  normalizeCategoryObj
} from '../components/merchant/common/constants';

export const useMenuStore = create((set, get) => ({
  menuItems: [],
  menuCategories: [
    { name: 'Starters', icon: 'fastfood' },
    { name: 'Main Course', icon: 'dinner' },
    { name: 'Dessert', icon: 'cookie' },
    { name: 'Beverages', icon: 'coffee' }
  ],
  popularCategory: { name: 'Popular', icon: 'star' },
  menuShifts: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
  activeShift: 'Breakfast',
  selectedMenuShift: 'Breakfast',
  takeoutActiveShift: 'Breakfast',
  menuDefaultGst: 0,
  menuDefaultOtherCharges: 0,
  menuDefaultOtherChargesType: 'percentage',
  originalMenuSnapshot: null,
  isSavingMenu: false,

  // Item Editor Modal State
  isMenuModalOpen: false,
  editingItemIndex: -1,
  modalForm: {
    name: '',
    description: '',
    price: '',
    category: 'Starters',
    isAvailable: true,
    imageUrl: '',
    isVeg: true,
    isPopular: false,
    customizations: []
  },
  zoomFactor: 100,
  imageTab: 'upload',
  itemModalError: '',

  // Categories Modal State
  isCategoryModalOpen: false,
  draftCategories: [],
  draftMenuItems: [],
  draftPopularCategory: { name: 'Popular', icon: 'star' },
  editingPopularName: false,
  editingPopularValue: 'Popular',
  newCategoryName: '',
  newCategoryIcon: 'utensils',
  openIconPickerIndex: null,
  editingCategoryIndex: null,
  editingCategoryValue: '',
  isSavingCategories: false,

  // Shifts Modal State
  isShiftModalOpen: false,
  switchingShift: false,

  // Change Detection
  hasMenuChanges: () => {
    const { originalMenuSnapshot, menuItems, menuCategories, popularCategory } = get();
    if (!originalMenuSnapshot) return false;
    try {
      const original = JSON.parse(originalMenuSnapshot);
      const itemsChanged = JSON.stringify(menuItems) !== JSON.stringify(original.items || []);
      const categoriesChanged = JSON.stringify(menuCategories) !== JSON.stringify(original.categories || []);
      const popularChanged = JSON.stringify(popularCategory) !== JSON.stringify(original.popularCategory || { name: 'Popular', icon: 'star' });
      return itemsChanged || categoriesChanged || popularChanged;
    } catch {
      return false;
    }
  },

  hasCategoryChanges: () => {
    const { draftCategories, menuCategories, draftPopularCategory, popularCategory, draftMenuItems, menuItems } = get();
    return (
      JSON.stringify(draftCategories) !== JSON.stringify(menuCategories) ||
      JSON.stringify(draftPopularCategory) !== JSON.stringify(popularCategory) ||
      JSON.stringify(draftMenuItems) !== JSON.stringify(menuItems)
    );
  },

  // Setters
  setSelectedMenuShift: (shift) => set({ selectedMenuShift: shift }),
  setIsShiftModalOpen: (open) => set({ isShiftModalOpen: open }),
  setIsMenuModalOpen: (open) => set({ isMenuModalOpen: open }),
  setModalForm: (updater) => set(state => ({
    modalForm: typeof updater === 'function' ? updater(state.modalForm) : updater
  })),
  setZoomFactor: (zoom) => set({ zoomFactor: zoom }),
  setImageTab: (tab) => set({ imageTab: tab }),
  setItemModalError: (err) => set({ itemModalError: err }),

  setDraftPopularCategory: (updater) => set(state => ({
    draftPopularCategory: typeof updater === 'function' ? updater(state.draftPopularCategory) : updater
  })),
  setEditingPopularName: (val) => set({ editingPopularName: val }),
  setEditingPopularValue: (val) => set({ editingPopularValue: val }),
  setOpenIconPickerIndex: (val) => set({ openIconPickerIndex: val }),
  setEditingCategoryValue: (val) => set({ editingCategoryValue: val }),
  setNewCategoryName: (val) => set({ newCategoryName: val }),
  setNewCategoryIcon: (val) => set({ newCategoryIcon: val }),

  // Actions
  fetchMenu: async (token, appId) => {
    if (!token || !appId) return;
    try {
      const res = await axios.get(`${API_BASE}/host/menu?hostApplicationId=${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success && res.data?.data) {
        const menuData = res.data.data;
        const loadedItems = menuData.items || [];
        const rawCats = (menuData.categories && menuData.categories.length > 0)
          ? menuData.categories
          : ['Starters', 'Main Course', 'Dessert', 'Beverages'];
        const loadedCategories = rawCats.map(normalizeCategoryObj);
        const loadedPopular = {
          name: menuData.popularCategory?.name || 'Popular',
          icon: menuData.popularCategory?.icon || 'star'
        };

        const snapshot = JSON.stringify({
          items: loadedItems,
          categories: loadedCategories,
          popularCategory: loadedPopular
        });

        set({
          menuItems: loadedItems,
          draftMenuItems: loadedItems,
          menuCategories: loadedCategories,
          draftCategories: loadedCategories,
          popularCategory: loadedPopular,
          draftPopularCategory: loadedPopular,
          menuShifts: (menuData.shifts && menuData.shifts.length > 0) ? menuData.shifts : get().menuShifts,
          activeShift: menuData.activeShift || get().activeShift,
          selectedMenuShift: menuData.activeShift || get().selectedMenuShift,
          takeoutActiveShift: menuData.activeShift || get().takeoutActiveShift,
          menuDefaultGst: menuData.defaultGst !== undefined ? menuData.defaultGst : 0,
          menuDefaultOtherCharges: menuData.defaultOtherCharges !== undefined ? menuData.defaultOtherCharges : 0,
          menuDefaultOtherChargesType: menuData.defaultOtherChargesType || 'percentage',
          originalMenuSnapshot: snapshot
        });
      }
    } catch (err) {
      console.error('fetchMenu error:', err.message);
    }
  },

  handleSaveMenu: async (token, outletId) => {
    const { showToast } = useUIStore.getState();
    const { menuItems, menuCategories, popularCategory, menuShifts, activeShift, menuDefaultGst, menuDefaultOtherCharges, menuDefaultOtherChargesType } = get();

    if (!outletId) {
      showToast('Please select an approved outlet to save the menu.', 'error');
      return;
    }

    set({ isSavingMenu: true });
    try {
      await axios.post(`${API_BASE}/host/menu`, {
        hostApplicationId: outletId,
        items: menuItems,
        categories: menuCategories,
        popularCategory: popularCategory,
        shifts: menuShifts,
        activeShift: activeShift,
        defaultGst: menuDefaultGst,
        defaultOtherCharges: menuDefaultOtherCharges,
        defaultOtherChargesType: menuDefaultOtherChargesType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      set({
        originalMenuSnapshot: JSON.stringify({
          items: menuItems,
          categories: menuCategories,
          popularCategory: popularCategory
        })
      });

      showToast('Menu saved and synchronized with all kiosks!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save menu changes.', 'error');
    } finally {
      set({ isSavingMenu: false });
    }
  },

  openCreateModal: (category = 'Starters') => {
    const { selectedMenuShift, activeShift } = get();
    set({
      editingItemIndex: -1,
      modalForm: {
        name: '',
        description: '',
        price: '',
        category: category || 'Starters',
        isAvailable: true,
        imageUrl: '',
        isVeg: true,
        isPopular: false,
        isAllShifts: true,
        shifts: [selectedMenuShift || activeShift || 'Breakfast'],
        gst: '',
        otherCharges: '',
        otherChargesType: 'percentage',
        customizations: []
      },
      zoomFactor: 100,
      imageTab: 'upload',
      itemModalError: '',
      isMenuModalOpen: true
    });
  },

  openEditModal: (item, index) => {
    const { selectedMenuShift, activeShift, menuDefaultGst, menuDefaultOtherCharges, menuDefaultOtherChargesType } = get();
    set({
      editingItemIndex: index,
      modalForm: {
        name: item.name || '',
        description: item.description || '',
        price: item.price ? (item.price / 100).toString() : '',
        category: item.category || 'Starters',
        isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
        imageUrl: item.imageUrl || '',
        isVeg: item.isVeg !== undefined ? item.isVeg : true,
        isPopular: item.isPopular || false,
        isAllShifts: item.isAllShifts === true,
        shifts: Array.isArray(item.shifts) && item.shifts.length > 0 ? item.shifts : [selectedMenuShift || activeShift || 'Breakfast'],
        gst: item.gst !== undefined && item.gst !== null ? item.gst.toString() : (menuDefaultGst || 0).toString(),
        otherCharges: item.otherCharges !== undefined && item.otherCharges !== null ? item.otherCharges.toString() : (menuDefaultOtherCharges || 0).toString(),
        otherChargesType: (item.otherCharges !== undefined && item.otherCharges !== null) ? (item.otherChargesType || 'percentage') : (menuDefaultOtherChargesType || 'percentage'),
        customizations: Array.isArray(item.customizations)
          ? item.customizations.map(c => ({
              title: c.title || '',
              pricingType: c.pricingType || 'addon',
              isMultiple: Boolean(c.isMultiple),
              isRequired: Boolean(c.isRequired),
              options: Array.isArray(c.options)
                ? c.options.map(o => ({
                    name: o.name || '',
                    extraPrice: o.extraPrice !== undefined ? (o.extraPrice / 100).toString() : '0',
                    isDefault: Boolean(o.isDefault)
                  }))
                : []
            }))
          : []
      },
      zoomFactor: 100,
      imageTab: (item.imageUrl && (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://'))) ? 'url' : 'upload',
      itemModalError: '',
      isMenuModalOpen: true
    });
  },

  handleSaveModalItem: () => {
    const { modalForm, editingItemIndex, menuItems, selectedMenuShift, activeShift } = get();
    const { showToast } = useUIStore.getState();

    if (!modalForm.name.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }
    const priceVal = parseFloat(modalForm.price);
    if (isNaN(priceVal) || priceVal < 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    const priceInPaise = Math.round(priceVal * 100);
    const cleanedCustomizations = (modalForm.customizations || [])
      .filter(g => g.title && g.title.trim())
      .map(g => {
        const isDirect = g.pricingType === 'direct';
        const rawOpts = (g.options || []).filter(o => o.name && o.name.trim());
        const hasDefault = rawOpts.some(o => o.isDefault);
        return {
          title: g.title.trim(),
          pricingType: isDirect ? 'direct' : 'addon',
          isMultiple: isDirect ? false : Boolean(g.isMultiple),
          isRequired: Boolean(g.isRequired),
          options: rawOpts.map((o, optIdx) => {
            const extra = parseFloat(o.extraPrice);
            return {
              name: o.name.trim(),
              extraPrice: isNaN(extra) || extra < 0 ? 0 : Math.round(extra * 100),
              isDefault: isDirect ? (hasDefault ? Boolean(o.isDefault) : optIdx === 0) : Boolean(o.isDefault)
            };
          })
        };
      });

    const itemData = {
      name: modalForm.name,
      description: modalForm.description,
      price: priceInPaise,
      category: modalForm.category,
      isAvailable: modalForm.isAvailable,
      imageUrl: modalForm.imageUrl,
      isVeg: modalForm.isVeg,
      isPopular: modalForm.isPopular,
      isAllShifts: modalForm.isAllShifts === true,
      shifts: modalForm.isAllShifts ? [] : (modalForm.shifts && modalForm.shifts.length > 0 ? modalForm.shifts : [selectedMenuShift || activeShift || 'Breakfast']),
      gst: null,
      otherCharges: null,
      otherChargesType: 'percentage',
      customizations: cleanedCustomizations
    };

    if (editingItemIndex === -1) {
      set({
        menuItems: [...menuItems, { itemId: `item_${Date.now()}`, ...itemData }],
        isMenuModalOpen: false
      });
    } else {
      const updated = [...menuItems];
      updated[editingItemIndex] = { ...updated[editingItemIndex], ...itemData };
      set({
        menuItems: updated,
        isMenuModalOpen: false
      });
    }
  },

  handleModalImageUpload: async (fileOrEvent, token, outletId) => {
    const { showToast } = useUIStore.getState();
    const file = fileOrEvent?.target?.files?.[0] || (fileOrEvent instanceof File ? fileOrEvent : fileOrEvent?.files?.[0]);
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      showToast('Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.', 'error');
      return;
    }

    let targetOutletId = outletId;
    if (!targetOutletId && typeof window !== 'undefined') {
      try {
        const { useOutletStore } = require('./useOutletStore');
        targetOutletId = useOutletStore.getState().selectedOutletId;
      } catch (err) {}
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      try {
        const headers = {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Filename': encodeURIComponent(file.name),
          'Authorization': `Bearer ${token}`
        };
        if (targetOutletId) {
          headers['X-Host-Application-Id'] = targetOutletId;
        }

        const response = await axios.post(`${API_BASE}/host/menu/upload-image`, arrayBuffer, {
          headers
        });

        if (response.data.success && response.data.data.url) {
          set(state => ({ modalForm: { ...state.modalForm, imageUrl: response.data.data.url } }));
          showToast('Image uploaded successfully!', 'success');
        } else {
          showToast(response.data.message || 'Upload failed', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast(err.response?.data?.message || 'Failed to upload image.', 'error');
      } finally {
        if (fileOrEvent?.target) fileOrEvent.target.value = '';
      }
    };
    reader.onerror = () => showToast('Failed to read file.', 'error');
    reader.readAsArrayBuffer(file);
  },

  togglePopular: (index) => {
    const { menuItems } = get();
    const updated = [...menuItems];
    updated[index] = { ...updated[index], isPopular: !updated[index].isPopular };
    set({ menuItems: updated });
  },

  removeMenuItem: (index) => {
    const { menuItems } = get();
    const item = menuItems[index];
    if (window.confirm(`Are you sure you want to delete "${item?.name || 'this item'}"?`)) {
      set({ menuItems: menuItems.filter((_, i) => i !== index) });
    }
  },

  openCategoryModal: (editIndex = null, editName = '') => {
    const { menuCategories, popularCategory, menuItems } = get();
    const normalized = menuCategories.map(normalizeCategoryObj);
    set({
      draftCategories: normalized,
      draftPopularCategory: { ...popularCategory },
      editingPopularName: false,
      editingPopularValue: popularCategory.name || 'Popular',
      draftMenuItems: [...menuItems],
      editingCategoryIndex: editIndex,
      editingCategoryValue: typeof editName === 'object' && editName ? editName.name : (editName || ''),
      newCategoryName: '',
      newCategoryIcon: 'utensils',
      openIconPickerIndex: null,
      isCategoryModalOpen: true
    });
  },

  closeCategoryModal: () => {
    if (get().hasCategoryChanges()) {
      if (!window.confirm('You have unsaved category changes. Discard them?')) {
        return;
      }
    }
    set({
      isCategoryModalOpen: false,
      openIconPickerIndex: null,
      newCategoryName: '',
      newCategoryIcon: 'utensils',
      editingPopularName: false,
      editingCategoryIndex: null,
      editingCategoryValue: ''
    });
  },

  handleSelectCategoryIcon: (targetIndex, iconKey) => {
    const { draftCategories } = get();
    if (targetIndex === 'popular') {
      set(state => ({ draftPopularCategory: { ...state.draftPopularCategory, icon: iconKey } }));
    } else if (targetIndex === 'new') {
      set({ newCategoryIcon: iconKey });
    } else {
      const updated = [...draftCategories];
      const cur = updated[targetIndex];
      updated[targetIndex] = {
        name: getCategoryName(cur),
        icon: iconKey
      };
      set({ draftCategories: updated });
    }
    set({ openIconPickerIndex: null });
  },

  handleMoveDraftCategory: (index, direction) => {
    const { draftCategories, openIconPickerIndex } = get();
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draftCategories.length) return;

    const reordered = [...draftCategories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    set({
      draftCategories: reordered,
      openIconPickerIndex: openIconPickerIndex === index ? targetIndex : openIconPickerIndex
    });
  },

  handleMoveMainCategory: (index, direction) => {
    const { menuCategories } = get();
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= menuCategories.length) return;

    const reordered = [...menuCategories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    set({ menuCategories: reordered });
  },

  handleStartEditCategory: (index, cat) => {
    set({
      editingCategoryIndex: index,
      editingCategoryValue: getCategoryName(cat),
      openIconPickerIndex: null
    });
  },

  handleCancelEditCategory: () => {
    set({ editingCategoryIndex: null, editingCategoryValue: '' });
  },

  handleSaveEditDraftCategory: (index) => {
    const { editingCategoryValue, draftCategories, draftMenuItems } = get();
    const { showToast } = useUIStore.getState();
    const trimmed = (editingCategoryValue || '').trim();
    if (!trimmed) {
      showToast('Category name cannot be empty.', 'error');
      return;
    }
    const oldCat = draftCategories[index];
    const oldName = getCategoryName(oldCat);
    const oldIcon = getCategoryIconKey(oldCat) || getSuggestedIconKey(trimmed);

    if (trimmed.toLowerCase() === oldName.toLowerCase()) {
      if (trimmed !== oldName) {
        const updatedCats = [...draftCategories];
        updatedCats[index] = { name: trimmed, icon: oldIcon };
        set({ draftCategories: updatedCats });
      }
      get().handleCancelEditCategory();
      return;
    }

    const isDuplicate = draftCategories.some((cat, i) => i !== index && getCategoryName(cat).toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      showToast('A category with this name already exists.', 'error');
      return;
    }

    const updatedCategories = [...draftCategories];
    updatedCategories[index] = { name: trimmed, icon: oldIcon };

    const updatedDraftItems = draftMenuItems.map(item => {
      if ((item.category || '').toLowerCase() === oldName.toLowerCase()) {
        return { ...item, category: trimmed };
      }
      return item;
    });

    set({
      draftCategories: updatedCategories,
      draftMenuItems: updatedDraftItems
    });
    get().handleCancelEditCategory();
  },

  handleAddDraftCategory: () => {
    const { newCategoryName, newCategoryIcon, draftCategories } = get();
    const { showToast } = useUIStore.getState();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (draftCategories.some(c => getCategoryName(c).toLowerCase() === trimmed.toLowerCase())) {
      showToast('Category already exists!', 'error');
      return;
    }
    const iconToUse = newCategoryIcon || getSuggestedIconKey(trimmed);
    set({
      draftCategories: [...draftCategories, { name: trimmed, icon: iconToUse }],
      newCategoryName: '',
      newCategoryIcon: 'utensils',
      openIconPickerIndex: null
    });
  },

  handleDeleteDraftCategory: (index) => {
    const { draftCategories, draftMenuItems, openIconPickerIndex } = get();
    const { showToast } = useUIStore.getState();
    if (draftCategories.length <= 1) {
      showToast('You must keep at least 1 menu category.', 'error');
      return;
    }
    const cat = draftCategories[index];
    const catName = getCategoryName(cat);
    const itemCount = draftMenuItems.filter(i => (i.category || '').toLowerCase() === catName.toLowerCase()).length;
    const msg = itemCount > 0
      ? `Category "${catName}" contains ${itemCount} dish(es). Deleting this category will remove it from the categories list (dishes will remain in database). Are you sure?`
      : `Are you sure you want to delete category "${catName}"?`;
    if (window.confirm(msg)) {
      set({
        draftCategories: draftCategories.filter((_, i) => i !== index),
        openIconPickerIndex: openIconPickerIndex === index ? null : openIconPickerIndex
      });
    }
  },

  handleSaveModalCategories: async (token, outletId) => {
    const { draftCategories, draftMenuItems, draftPopularCategory, isSavingCategories } = get();
    const { showToast } = useUIStore.getState();
    if (isSavingCategories) return;

    set({ isSavingCategories: true });
    try {
      const normalizedUpdated = draftCategories.map(normalizeCategoryObj);
      await axios.post(`${API_BASE}/host/menu`, {
        hostApplicationId: outletId,
        items: draftMenuItems,
        categories: normalizedUpdated,
        popularCategory: draftPopularCategory,
        shifts: get().menuShifts,
        activeShift: get().activeShift,
        defaultGst: get().menuDefaultGst,
        defaultOtherCharges: get().menuDefaultOtherCharges,
        defaultOtherChargesType: get().menuDefaultOtherChargesType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      set({
        menuCategories: normalizedUpdated,
        menuItems: draftMenuItems,
        popularCategory: draftPopularCategory,
        isCategoryModalOpen: false,
        originalMenuSnapshot: JSON.stringify({
          items: draftMenuItems,
          categories: normalizedUpdated,
          popularCategory: draftPopularCategory
        })
      });
      showToast('Menu categories saved successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save menu categories.', 'error');
    } finally {
      set({ isSavingCategories: false });
    }
  },

  handleSwitchShift: async (token, outletId, shiftName) => {
    const { showToast } = useUIStore.getState();
    if (!outletId) return;
    set({ switchingShift: true });
    try {
      await axios.post(`${API_BASE}/host/menu/switch-shift`, {
        hostApplicationId: outletId,
        activeShift: shiftName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({
        activeShift: shiftName,
        selectedMenuShift: shiftName,
        takeoutActiveShift: shiftName
      });
      showToast(`Active shift switched to ${shiftName}!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to switch shift', 'error');
    } finally {
      set({ switchingShift: false });
    }
  },

  handleSaveShifts: async (token, outletId, updatedShifts) => {
    const { showToast } = useUIStore.getState();
    const { menuItems, menuCategories, popularCategory, activeShift, menuDefaultGst, menuDefaultOtherCharges, menuDefaultOtherChargesType } = get();
    if (!outletId) {
      showToast('Please select an approved outlet first.', 'error');
      return;
    }
    try {
      await axios.post(`${API_BASE}/host/menu`, {
        hostApplicationId: outletId,
        items: menuItems,
        categories: menuCategories,
        popularCategory: popularCategory,
        shifts: updatedShifts,
        activeShift: activeShift,
        defaultGst: menuDefaultGst,
        defaultOtherCharges: menuDefaultOtherCharges,
        defaultOtherChargesType: menuDefaultOtherChargesType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set(state => ({
        menuShifts: updatedShifts,
        selectedMenuShift: updatedShifts.includes(state.selectedMenuShift) ? state.selectedMenuShift : (updatedShifts[0] || 'Breakfast'),
        takeoutActiveShift: updatedShifts.includes(state.takeoutActiveShift) ? state.takeoutActiveShift : (updatedShifts[0] || 'Breakfast')
      }));
      showToast('Shifts updated successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update shifts.', 'error');
    }
  }
}));
