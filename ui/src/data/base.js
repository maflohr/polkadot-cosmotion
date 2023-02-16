import axios from "axios";

export default {
    async get(url, params) {
        return (await axios.get(url, params)).data;
    }
}
