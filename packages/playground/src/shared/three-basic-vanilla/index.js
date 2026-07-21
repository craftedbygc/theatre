import studio from '@unseenco/theatre-studio'
import {getProject} from '@unseenco/theatre-core'
import {createThreeScene} from './ThreeScene.js'

studio.initialize()

const project = getProject('Three Basic Vanilla')
createThreeScene(project)
