import { Dimension, Entity, MolangVariableMap, Player, Vector3, world } from "@minecraft/server"
import { VecUtils } from "./math_utils"

export class ParticleUtils {

    static DIMENSION: Dimension | undefined
    static LOCATION: Vector3 = {x: 0,y:0,z:0}
    static PARTICLES: string[] = []
    static MOLANG_MAP: MolangVariableMap
    static start(particleIds: string[] | string) {
        if (typeof particleIds === "string") particleIds = [particleIds]
        this.PARTICLES = particleIds
        this.MOLANG_MAP = new MolangVariableMap()
        return ParticleUtils
    }

    static location(vec: Vector3) {
        this.LOCATION = vec
        return ParticleUtils
    }

    static direction(vec: Vector3) {
        this.MOLANG_MAP.setFloat("utils_x", vec.x)
        this.MOLANG_MAP.setFloat("utils_y", vec.y)
        this.MOLANG_MAP.setFloat("utils_z", vec.z)
        return ParticleUtils
    }

    static variable(k: string, v: number) {
        this.MOLANG_MAP.setFloat(k, v)
        return ParticleUtils
    }

    static entity(entity: Entity, hori: boolean = true) {
        this.DIMENSION = entity.dimension
        this.location(entity.location)
        this.direction(hori?VecUtils.hori(entity.getViewDirection()):entity.getViewDirection())
        return ParticleUtils
    }

    static end(players?: Player[]) {
        this.PARTICLES.forEach(particle=>{
            if (!players) {
                (this.DIMENSION ?? world.getDimension("overworld")).spawnParticle(particle, this.LOCATION, this.MOLANG_MAP)
            } else {
                players.forEach(player=>player.spawnParticle(particle, this.LOCATION, this.MOLANG_MAP))
            }
        })
        this.PARTICLES = []
        this.DIMENSION = world.getDimension("overworld")
        this.LOCATION  = {x: 0,y:0,z:0}
            return ParticleUtils
    }
}