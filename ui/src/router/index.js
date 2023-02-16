import { createRouter, createWebHistory } from "vue-router"
import HomeView from "../views/HomeView.vue"

const routes = [
  {
    path: "/:id?",
    name: "home",
    component: HomeView,
    props: route => ({
      id: route.params.id,
      q: route.query.q
    }),
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
