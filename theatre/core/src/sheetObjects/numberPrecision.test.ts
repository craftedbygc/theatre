import {getProject} from '@unseenco/theatre-core'
import {number} from '@unseenco/theatre-core/propTypes'
import {privateAPI} from '@unseenco/theatre-core/privateAPIs'

describe('project-level numberPrecision', () => {
  it('is applied when sheet objects are created', () => {
    const project = getProject(`NumPrec${Date.now() % 100000}`, {
      numberPrecision: 2,
    })
    const obj = project
      .sheet('Scene')
      .object('Box', {x: number(0), y: number(0, {precision: 0})})

    const projectConfig = privateAPI(project).config
    expect(projectConfig.numberPrecision).toBe(2)

    const config = privateAPI(obj).template.staticConfig
    expect(config.type).toBe('compound')
    if (config.type !== 'compound') return

    expect(config.props.x.type).toBe('number')
    if (config.props.x.type !== 'number') return
    expect(config.props.x.precision).toBe(2)

    expect(config.props.y.type).toBe('number')
    if (config.props.y.type !== 'number') return
    expect(config.props.y.precision).toBe(0)
  })
})
