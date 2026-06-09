import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_SETTINGS_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface UpdateSettingDto {
  value: string;
  description: string;
}

export const settingsService = {

  getAllSettings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  },

 
  getSettingById: async (id: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching setting ${id}:`, error);
      throw error;
    }
  },


  getSettingByKey: async (key: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/key/${key}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching setting with key ${key}:`, error);
      throw error;
    }
  },

  getSystemSettings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/system/config`);
      return response.data;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw error;
    }
  },


  createSetting: async (data: { key: string; value: string; description: string }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/settings`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating setting:', error);
      throw error;
    }
  },


  updateSetting: async (id: number, data: UpdateSettingDto) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/settings/${id}`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating setting ${id}:`, error);
      throw error;
    }
  },

  
  deleteSetting: async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/settings/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error(`Error deleting setting ${id}:`, error);
      throw error;
    }
  }
};
